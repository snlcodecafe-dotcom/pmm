import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const botHandlerUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-bot-handler`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

  let totalProcessed = 0;

  // Read initial offset
  const { data: state, error: stateErr } = await supabase
    .from("telegram_bot_state")
    .select("update_offset")
    .eq("id", 1)
    .single();

  if (stateErr) {
    return new Response(JSON.stringify({ error: stateErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let currentOffset = state.update_offset;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    try {
      const response = await fetch(`${TELEGRAM_API}${botToken}/getUpdates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offset: currentOffset,
          timeout,
          allowed_updates: ["message", "callback_query"],
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        console.error("getUpdates error:", data);
        break;
      }

      const updates = data.result ?? [];
      if (updates.length === 0) continue;

      // Process each update through bot handler
      for (const update of updates) {
        try {
          await fetch(botHandlerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ action: "process_update", update }),
          });
          totalProcessed++;
        } catch (e) {
          console.error("Bot handler call error:", e);
        }
      }

      // Advance offset
      const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase
        .from("telegram_bot_state")
        .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
        .eq("id", 1);

      currentOffset = newOffset;
    } catch (e) {
      console.error("Poll loop error:", e);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
