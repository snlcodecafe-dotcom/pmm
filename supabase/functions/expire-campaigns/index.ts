import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Expire token submissions past their expires_at
    const { data: expiredTokens, error: e1 } = await supabase
      .from("token_submissions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString())
      .select("id, token_symbol");

    // Expire campaigns past their end_time
    const { data: expiredCampaigns, error: e2 } = await supabase
      .from("campaigns")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("end_time", new Date().toISOString())
      .select("id, name");

    // Expire community missions
    const { data: expiredMissions, error: e3 } = await supabase
      .from("community_missions")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", new Date().toISOString())
      .select("id, title");

    // Update bot activity logs for expired submissions
    if (expiredTokens && expiredTokens.length > 0) {
      const ids = expiredTokens.map(t => t.id);
      await supabase
        .from("bot_activity_log")
        .update({ status: "completed" })
        .in("token_submission_id", ids)
        .eq("status", "live");
    }

    const summary = {
      ok: true,
      expired_tokens: expiredTokens?.length ?? 0,
      expired_campaigns: expiredCampaigns?.length ?? 0,
      expired_missions: expiredMissions?.length ?? 0,
      errors: [e1, e2, e3].filter(Boolean).map(String),
      ran_at: new Date().toISOString(),
    };

    console.log("expire-campaigns:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("expire-campaigns error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
