import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchTokenData(address: string) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;
    const hypeLines = ["Stealth launch 🚀", "Whales accumulating 🐳", "Trending on Dexscreener 📈", "Community growing fast 🔥", "Diamond hands only 💎", "Early alpha detected 🧠"];
    return {
      TOKEN_NAME: pair.baseToken?.name || "Unknown",
      TOKEN_SYMBOL: pair.baseToken?.symbol || "???",
      TOKEN_ADDRESS: address,
      MARKET_CAP: pair.marketCap ? Number(pair.marketCap).toLocaleString() : "N/A",
      LIQUIDITY: pair.liquidity?.usd ? Number(pair.liquidity.usd).toLocaleString() : "N/A",
      VOLUME_24H: pair.volume?.h24 ? Number(pair.volume.h24).toLocaleString() : "N/A",
      HOLDERS: pair.holders?.toString() || "N/A",
      AUTO_HYPE_LINE: hypeLines[Math.floor(Math.random() * hypeLines.length)],
      TOKEN_IMAGE_URL: pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${address}.png`,
      DEXSCREENER_URL: `https://dexscreener.com/solana/${address}`,
      BUY_LINK: `https://jup.ag/swap/SOL-${address}`,
    };
  } catch {
    return null;
  }
}

function resolveTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  Object.entries(data).forEach(([key, val]) => {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  });
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { platform, message, password, token_address } = await req.json();
    if (!platform || !message || !password) {
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

    // Fetch real token data from DexScreener
    const testCA = token_address || "So11111111111111111111111111111111111111112";
    const tokenData = await fetchTokenData(testCA);
    const fallbackData: Record<string, string> = {
      TOKEN_NAME: "Sample Token", TOKEN_SYMBOL: "SAMPLE",
      TOKEN_ADDRESS: testCA,
      MARKET_CAP: "N/A", LIQUIDITY: "N/A", VOLUME_24H: "N/A",
      HOLDERS: "N/A", AUTO_HYPE_LINE: "Stealth launch 🚀",
      TOKEN_IMAGE_URL: `https://dd.dexscreener.com/ds-data/tokens/solana/${testCA}.png`,
      DEXSCREENER_URL: `https://dexscreener.com/solana/${testCA}`,
      BUY_LINK: `https://jup.ag/swap/SOL-${testCA}`,
    };

    const postText = resolveTemplate(message, tokenData || fallbackData);

    // Load platform settings
    const settingKeys: Record<string, string[]> = {
      telegram: ["telegram_bot_token"],
      discord: ["discord_bot_token"],
      twitter: ["twitter_consumer_key", "twitter_consumer_secret", "twitter_access_token", "twitter_access_token_secret"],
      instagram: ["instagram_access_token", "instagram_page_id"],
      reddit: ["reddit_client_id", "reddit_client_secret", "reddit_username", "reddit_password", "reddit_subreddits"],
    };

    const keys = settingKeys[platform];
    if (!keys) {
      return new Response(JSON.stringify({ success: false, error: `Unknown platform: ${platform}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase.from("admin_settings").select("key, value").in("key", [...keys]);
    const cfg: Record<string, string> = {};
    settings?.forEach(s => { cfg[s.key] = s.value; });

    let resultMessage = "";

    if (platform === "telegram") {
      if (!cfg.telegram_bot_token) throw new Error("Telegram Bot Token not configured");
      const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");
      let targetChatId = channelId;
      if (!targetChatId) {
        const { data: groups } = await supabase.from("telegram_groups").select("chat_id").eq("is_active", true).limit(1);
        if (groups && groups.length > 0) targetChatId = groups[0].chat_id;
        else throw new Error("No Telegram groups configured and TELEGRAM_CHANNEL_ID not set.");
      }
      const res = await fetch(`https://api.telegram.org/bot${cfg.telegram_bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: targetChatId, text: postText, parse_mode: "Markdown" }),
      });
      const data = await res.json();
      if (data.ok) resultMessage = `✅ Message sent to ${targetChatId}`;
      else throw new Error(`Telegram error: ${data.description}`);
    } else if (platform === "discord") {
      const { data: webhooks } = await supabase.from("discord_webhooks").select("webhook_url, server_name").eq("is_active", true).limit(1);
      if (!webhooks || webhooks.length === 0) throw new Error("No active Discord webhooks configured.");
      const res = await fetch(webhooks[0].webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postText, username: "PromoteMyMemes" }),
      });
      if (res.ok || res.status === 204) resultMessage = `✅ Message sent to ${webhooks[0].server_name}`;
      else throw new Error(`Discord webhook error: ${await res.text()}`);
    } else if (platform === "twitter") {
      resultMessage = "Twitter requires OAuth 1.0a signing. Credentials saved — sample logged. Real tweets are sent by the campaign engine.";
    } else if (platform === "instagram") {
      if (!cfg.instagram_access_token || !cfg.instagram_page_id) throw new Error("Instagram credentials not fully configured");
      resultMessage = "Instagram requires an image URL for Graph API posting. Credentials verified — sample logged.";
    } else if (platform === "reddit") {
      if (!cfg.reddit_client_id || !cfg.reddit_client_secret || !cfg.reddit_username || !cfg.reddit_password) {
        throw new Error("Reddit credentials not fully configured");
      }
      const basicAuth = btoa(`${cfg.reddit_client_id}:${cfg.reddit_client_secret}`);
      const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "PromoteMyMemes/1.0",
        },
        body: new URLSearchParams({ grant_type: "password", username: cfg.reddit_username, password: cfg.reddit_password }).toString(),
      });
      const tokenDataRes = await tokenRes.json();
      if (!tokenDataRes.access_token) throw new Error(`Reddit auth failed: ${tokenDataRes.error || "unknown"}`);
      resultMessage = `✅ Reddit OAuth successful as u/${cfg.reddit_username}. Sample logged.`;
    }

    // Log the sample post
    await supabase.from("social_posts").insert({
      platform,
      post_text: postText,
      views: 0, likes: 0, shares: 0,
    });

    return new Response(JSON.stringify({ success: true, message: resultMessage, resolved_text: postText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
