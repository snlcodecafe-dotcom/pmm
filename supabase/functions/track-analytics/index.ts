import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { event_type, token_submission_id, campaign_id, source_platform, source_url, metadata } = await req.json();

    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["click", "impression", "share", "conversion", "page_view", "cta_click"];
    if (!validTypes.includes(event_type)) {
      return new Response(JSON.stringify({ error: "Invalid event_type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Simple IP hash for dedup (privacy-safe)
    const forwarded = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const ip = forwarded.split(",")[0].trim();
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(ip + new Date().toISOString().slice(0, 10)));
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

    const userAgent = req.headers.get("user-agent") || "unknown";

    const { error } = await supabase.from("analytics_events").insert({
      event_type,
      token_submission_id: token_submission_id || null,
      campaign_id: campaign_id || null,
      source_platform: source_platform || null,
      source_url: source_url || null,
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 255),
      metadata: metadata || null,
    });

    if (error) throw error;

    // Also increment view count on token_submissions for page_view/impression
    if ((event_type === "page_view" || event_type === "impression") && token_submission_id) {
      try {
        await (supabase as any).rpc("increment_views_if_exists", { submission_id: token_submission_id });
      } catch {
        /* RPC not present; ignore */
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-analytics error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
