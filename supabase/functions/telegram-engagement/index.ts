import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

async function telegramCall(method: string, body: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode = "auto" } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");
    if (!channelId) {
      return new Response(JSON.stringify({ error: "TELEGRAM_CHANNEL_ID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pending engagement actions
    const { data: actions } = await supabase
      .from("engagement_actions")
      .select("*, viral_content(*)")
      .eq("posted", false)
      .order("created_at", { ascending: true })
      .limit(3);

    if (!actions || actions.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No pending engagement actions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posted: any[] = [];

    for (const action of actions) {
      try {
        if (action.action_type === "poll") {
          const payload = action.payload as any;
          const result = await telegramCall("sendPoll", {
            chat_id: channelId,
            question: payload.question || "What do you think?",
            options: payload.options || ["🚀 Bullish", "💀 Bearish", "🤔 Neutral"],
            is_anonymous: true,
            reply_to_message_id: action.viral_content?.telegram_message_id || undefined,
          });

          if (result.ok) {
            await supabase
              .from("engagement_actions")
              .update({
                posted: true,
                posted_at: new Date().toISOString(),
                telegram_message_id: result.result?.message_id,
              })
              .eq("id", action.id);

            posted.push({ id: action.id, type: "poll", message_id: result.result?.message_id });
          }
        } else if (action.action_type === "question") {
          const payload = action.payload as any;
          const result = await telegramCall("sendMessage", {
            chat_id: channelId,
            text: payload.text || `💬 Would you ape into $${action.viral_content?.token_symbol || "this"}?\n\nDrop your thoughts below 👇`,
            parse_mode: "Markdown",
            reply_to_message_id: action.viral_content?.telegram_message_id || undefined,
          });

          if (result.ok) {
            await supabase
              .from("engagement_actions")
              .update({
                posted: true,
                posted_at: new Date().toISOString(),
                telegram_message_id: result.result?.message_id,
              })
              .eq("id", action.id);

            posted.push({ id: action.id, type: "question", message_id: result.result?.message_id });
          }
        } else if (action.action_type === "cta") {
          const payload = action.payload as any;
          const result = await telegramCall("sendMessage", {
            chat_id: channelId,
            text: payload.text || "🔥 Want your token promoted next?\n\n👇 Launch your campaign now!",
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🚀 Promote Now", url: "https://promotemymemes.com/campaign-engine" }],
              ],
            },
          });

          if (result.ok) {
            await supabase
              .from("engagement_actions")
              .update({
                posted: true,
                posted_at: new Date().toISOString(),
                telegram_message_id: result.result?.message_id,
              })
              .eq("id", action.id);

            posted.push({ id: action.id, type: "cta", message_id: result.result?.message_id });
          }
        }

        // Rate limit between posts
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error("Engagement action error:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, posted: posted.length, details: posted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Engagement error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
