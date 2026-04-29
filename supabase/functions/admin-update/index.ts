import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { key, value, password } = await req.json();

    if (!key || value === undefined || value === null || !password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validKeys = [
      "admin_wallet", "admin_password", "solana_rpc_url", "solana_rpc_key", "stats_mode",
      "solana_rpc_devnet", "solana_rpc_mainnet_primary", "solana_rpc_mainnet_fallback_1", "solana_rpc_mainnet_fallback_2", "solana_rpc_active_preset",
      "telegram_bot_token", "telegram_enabled", "telegram_cooldown_minutes", "telegram_max_posts_per_hour",
      "discord_bot_token", "discord_enabled",
      "twitter_consumer_key", "twitter_consumer_secret", "twitter_access_token", "twitter_access_token_secret",
      "twitter_enabled", "twitter_posts_per_day",
      "instagram_access_token", "instagram_page_id", "instagram_enabled", "instagram_posts_per_day",
      "reddit_client_id", "reddit_client_secret", "reddit_username", "reddit_password",
      "reddit_enabled", "reddit_subreddits", "reddit_post_delay_minutes",
      "posting_frequency", "rate_limit_per_platform", "retry_failed_jobs",
      "plan_free", "plan_growth", "plan_viral",
      "packages_config",
      "msg_template_telegram", "msg_template_discord", "msg_template_twitter", "msg_template_instagram", "msg_template_reddit",
      "partner_bot_username", "partner_main_channel_username",
    ];
    if (!validKeys.includes(key)) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify password
    const { data: pwRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "admin_password")
      .single();

    if (!pwRow || pwRow.value !== password) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert the setting
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
