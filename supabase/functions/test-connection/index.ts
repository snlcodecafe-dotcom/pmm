import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { platform, password } = await req.json();
    if (!platform || !password) {
      return new Response(JSON.stringify({ success: false, error: "Missing fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify caller is an admin: prefer JWT + has_role('admin'); fall back to legacy password.
    let isAdmin = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await supabase.auth.getUser(token);
      if (u?.user) {
        const { data: hasRole } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
        if (hasRole) isAdmin = true;
      }
    }
    if (!isAdmin) {
      const { data: pwRow } = await supabase.from("admin_settings").select("value").eq("key", "admin_password").single();
      if (pwRow && pwRow.value === password) isAdmin = true;
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load relevant settings
    const keys: Record<string, string[]> = {
      telegram: ["telegram_bot_token"],
      discord: ["discord_bot_token"],
      twitter: ["twitter_consumer_key", "twitter_consumer_secret", "twitter_access_token", "twitter_access_token_secret"],
      instagram: ["instagram_access_token", "instagram_page_id"],
      reddit: ["reddit_client_id", "reddit_client_secret", "reddit_username", "reddit_password"],
    };

    const requiredKeys = keys[platform];
    if (!requiredKeys) {
      return new Response(JSON.stringify({ success: false, error: `Unknown platform: ${platform}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", requiredKeys);
    const cfg: Record<string, string> = {};
    settings?.forEach(s => { cfg[s.key] = s.value; });

    // Check missing credentials
    const missing = requiredKeys.filter(k => !cfg[k] || cfg[k].trim() === "");
    if (missing.length > 0) {
      const friendlyNames: Record<string, string> = {
        telegram_bot_token: "Bot Token",
        discord_bot_token: "Bot Token",
        twitter_consumer_key: "API Key",
        twitter_consumer_secret: "API Secret",
        twitter_access_token: "Access Token",
        twitter_access_token_secret: "Access Token Secret",
        instagram_access_token: "Page Access Token",
        instagram_page_id: "Business Page ID",
        reddit_client_id: "Client ID",
        reddit_client_secret: "Client Secret",
        reddit_username: "Username",
        reddit_password: "Password",
      };
      const names = missing.map(k => friendlyNames[k] || k).join(", ");
      return new Response(JSON.stringify({
        success: false,
        error: `Missing credentials: ${names}`,
        resolution: `Go to the Integrations tab and save the missing fields: ${names}`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Test actual connection
    let result: { success: boolean; message?: string; error?: string; resolution?: string };

    if (platform === "telegram") {
      const res = await fetch(`https://api.telegram.org/bot${cfg.telegram_bot_token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        result = { success: true, message: `Connected as @${data.result.username} (${data.result.first_name})` };
      } else {
        result = { success: false, error: `Telegram API error: ${data.description}`, resolution: "Check your Bot Token from @BotFather. It may be revoked or incorrect." };
      }
    } else if (platform === "discord") {
      // Test by calling Discord API /users/@me
      const res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { Authorization: `Bot ${cfg.discord_bot_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        result = { success: true, message: `Connected as ${data.username}#${data.discriminator} (ID: ${data.id})` };
      } else {
        const data = await res.json().catch(() => ({}));
        result = { success: false, error: `Discord API error: ${(data as any).message || res.statusText}`, resolution: "Verify your Bot Token from the Discord Developer Portal. Ensure the bot has not been deleted." };
      }
    } else if (platform === "twitter") {
      // Twitter v2 - verify credentials using OAuth 1.0a is complex, just verify keys are non-empty and well-formed
      // We'll do a basic check that keys look valid (length check)
      const ck = cfg.twitter_consumer_key;
      const cs = cfg.twitter_consumer_secret;
      if (ck.length >= 10 && cs.length >= 10 && cfg.twitter_access_token.length >= 10 && cfg.twitter_access_token_secret.length >= 10) {
        result = { success: true, message: "All 4 Twitter API credentials are configured. Full verification requires posting a test tweet." };
      } else {
        result = { success: false, error: "One or more Twitter credentials appear too short or invalid", resolution: "Go to developer.twitter.com, regenerate your API keys and tokens, and save them in the Integrations tab." };
      }
    } else if (platform === "instagram") {
      // Test with Instagram Graph API - get user info
      const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.instagram_page_id}?fields=id,username,name&access_token=${cfg.instagram_access_token}`);
      if (res.ok) {
        const data = await res.json();
        result = { success: true, message: `Connected to @${data.username || data.name || data.id}` };
      } else {
        const data = await res.json().catch(() => ({}));
        const err = (data as any).error;
        result = {
          success: false,
          error: `Instagram API error: ${err?.message || res.statusText}`,
          resolution: err?.code === 190
            ? "Your access token has expired. Generate a new long-lived token from the Meta Developer Portal."
            : "Verify your Page Access Token and Business Page ID. Ensure instagram_basic and instagram_content_publish permissions are granted.",
        };
      }
    } else if (platform === "reddit") {
      // Test Reddit OAuth2 token
      const basicAuth = btoa(`${cfg.reddit_client_id}:${cfg.reddit_client_secret}`);
      const body = new URLSearchParams({
        grant_type: "password",
        username: cfg.reddit_username,
        password: cfg.reddit_password,
      });
      const res = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "PromoteMyMemes/1.0",
        },
        body: body.toString(),
      });
      const data = await res.json();
      if (data.access_token) {
        // Verify by getting /api/v1/me
        const meRes = await fetch("https://oauth.reddit.com/api/v1/me", {
          headers: { Authorization: `Bearer ${data.access_token}`, "User-Agent": "PromoteMyMemes/1.0" },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          result = { success: true, message: `Connected as u/${me.name} (${me.total_karma} karma)` };
        } else {
          result = { success: true, message: "OAuth token obtained but couldn't fetch profile. Connection works." };
        }
      } else {
        result = {
          success: false,
          error: `Reddit auth error: ${data.error || "unknown"}`,
          resolution: data.error === "invalid_grant"
            ? "Username or password is incorrect. Use the bot account credentials, not your personal account."
            : "Verify Client ID, Client Secret, and bot account credentials at reddit.com/prefs/apps",
        };
      }
    } else {
      result = { success: false, error: "Unknown platform" };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
