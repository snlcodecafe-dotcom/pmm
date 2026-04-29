import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Telegram posting ──────────────────────────────────────────────────────────

async function postToTelegram(
  supabase: any, submissionId: string, botToken: string, postText: string, tokenAddress: string
): Promise<{ success: number; failed: number; logs: any[] }> {
  const { data: groups } = await supabase
    .from("telegram_groups")
    .select("*")
    .eq("is_active", true);

  if (!groups?.length) return { success: 0, failed: 0, logs: [] };

  const now = Date.now();
  const logs: any[] = [];
  let success = 0, failed = 0;

  // Per-token cooldown: prevents spamming the SAME token to the same group repeatedly,
  // but allows DIFFERENT tokens/campaigns to post immediately.
  // We look up the most recent successful post of THIS token in each group.
  const recentPosts = new Map<string, string>(); // group_id -> last_post_at for this token
  if (tokenAddress) {
    const { data: subs } = await supabase
      .from("token_submissions")
      .select("id")
      .eq("token_address", tokenAddress);
    const submissionIds = (subs || []).map((s: any) => s.id);
    if (submissionIds.length > 0) {
      const { data: recentLogs } = await supabase
        .from("campaign_execution_logs")
        .select("request_payload, executed_at, status, platform")
        .eq("platform", "telegram")
        .eq("status", "delivered")
        .in("token_submission_id", submissionIds)
        .order("executed_at", { ascending: false })
        .limit(200);
      for (const log of recentLogs || []) {
        const chatId = log.request_payload?.chat_id;
        if (chatId && !recentPosts.has(String(chatId))) {
          recentPosts.set(String(chatId), log.executed_at);
        }
      }
    }
  }

  for (const group of groups) {
    const lastSameTokenPost = recentPosts.get(String(group.chat_id));
    if (lastSameTokenPost) {
      const elapsed = (now - new Date(lastSameTokenPost).getTime()) / 60000;
      if (elapsed < group.cooldown_minutes) {
        logs.push({
          token_submission_id: submissionId,
          platform: "telegram",
          action_type: "skipped",
          status: "cooldown",
          request_payload: { chat_id: group.chat_id, group_name: group.group_name },
          response_payload: { reason: `Same token cooldown: ${Math.ceil(group.cooldown_minutes - elapsed)}m remaining for this token in this group` },
          executed_at: new Date().toISOString(),
        });
        continue;
      }
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: group.chat_id,
          text: postText,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        success++;
        logs.push({
          token_submission_id: submissionId,
          platform: "telegram",
          action_type: "post",
          status: "delivered",
          external_id: String(data.result.message_id),
          request_payload: { chat_id: group.chat_id, group_name: group.group_name },
          response_payload: { message_id: data.result.message_id, chat: data.result.chat?.title },
          executed_at: new Date().toISOString(),
        });

        await supabase.from("telegram_groups").update({
          last_post_at: new Date().toISOString(),
          total_posts: (group.total_posts || 0) + 1,
        }).eq("id", group.id);
      } else {
        failed++;
        logs.push({
          token_submission_id: submissionId,
          platform: "telegram",
          action_type: "post",
          status: "failed",
          error_message: data.description || "Unknown Telegram error",
          request_payload: { chat_id: group.chat_id, group_name: group.group_name },
          response_payload: data,
          executed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      failed++;
      logs.push({
        token_submission_id: submissionId,
        platform: "telegram",
        action_type: "post",
        status: "failed",
        error_message: String(err),
        request_payload: { chat_id: group.chat_id, group_name: group.group_name },
        executed_at: new Date().toISOString(),
      });
    }

    await new Promise(r => setTimeout(r, 50));
  }

  return { success, failed, logs };
}

// ── Discord posting (webhook) ─────────────────────────────────────────────────

async function postToDiscord(
  supabase: any, submissionId: string, symbol: string, postText: string, tokenAddress: string
): Promise<{ success: number; failed: number; logs: any[] }> {
  const { data: webhooks } = await supabase
    .from("discord_webhooks")
    .select("*")
    .eq("is_active", true);

  if (!webhooks?.length) return { success: 0, failed: 0, logs: [] };

  const logs: any[] = [];
  let success = 0, failed = 0;

  for (const wh of webhooks) {
    try {
      const embed = {
        title: `🚀 ${symbol} — New Promotion`,
        description: postText.slice(0, 2048),
        color: 0x00d4aa,
        fields: [
          { name: "Token", value: symbol, inline: true },
          { name: "Contract", value: `\`${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-4)}\``, inline: true },
        ],
        footer: { text: "PromoteMyMemes.com" },
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${wh.webhook_url}?wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (res.ok) {
        const data = await res.json();
        success++;
        logs.push({
          token_submission_id: submissionId,
          platform: "discord",
          action_type: "webhook",
          status: "delivered",
          external_id: data.id,
          request_payload: { server: wh.server_name, channel: wh.channel_name },
          response_payload: { message_id: data.id },
          executed_at: new Date().toISOString(),
        });

        await supabase.from("discord_webhooks").update({
          last_post_at: new Date().toISOString(),
          total_posts: (wh.total_posts || 0) + 1,
        }).eq("id", wh.id);
      } else {
        const errText = await res.text();
        failed++;
        logs.push({
          token_submission_id: submissionId,
          platform: "discord",
          action_type: "webhook",
          status: "failed",
          error_message: `HTTP ${res.status}: ${errText}`,
          request_payload: { server: wh.server_name, channel: wh.channel_name },
          executed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      failed++;
      logs.push({
        token_submission_id: submissionId,
        platform: "discord",
        action_type: "webhook",
        status: "failed",
        error_message: String(err),
        request_payload: { server: wh.server_name, channel: wh.channel_name },
        executed_at: new Date().toISOString(),
      });
    }

    await new Promise(r => setTimeout(r, 100));
  }

  return { success, failed, logs };
}

// ── Twitter/X posting (OAuth 1.0a) ────────────────────────────────────────────

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function postToTwitter(
  submissionId: string,
  postText: string,
  credentials: { consumerKey: string; consumerSecret: string; accessToken: string; accessTokenSecret: string }
): Promise<{ success: boolean; log: any }> {
  const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = credentials;

  const url = "https://api.x.com/2/tweets";
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID().replace(/-/g, "");

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  const paramString = Object.keys(oauthParams).sort()
    .map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join("&");

  const signatureBase = `${method}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(accessTokenSecret)}`;
  const signature = await hmacSha1(signingKey, signatureBase);

  const authHeader = "OAuth " + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ");

  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ text: postText }),
    });

    const data = await res.json();

    if (res.ok && data.data?.id) {
      return {
        success: true,
        log: {
          token_submission_id: submissionId,
          platform: "twitter",
          action_type: "tweet",
          status: "delivered",
          external_id: data.data.id,
          external_url: `https://x.com/i/status/${data.data.id}`,
          response_payload: data,
          executed_at: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: false,
        log: {
          token_submission_id: submissionId,
          platform: "twitter",
          action_type: "tweet",
          status: "failed",
          error_message: JSON.stringify(data.errors || data),
          response_payload: data,
          executed_at: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    return {
      success: false,
      log: {
        token_submission_id: submissionId,
        platform: "twitter",
        action_type: "tweet",
        status: "failed",
        error_message: String(err),
        executed_at: new Date().toISOString(),
      },
    };
  }
}

// ── Instagram posting (Meta Graph API) ────────────────────────────────────────

async function postToInstagram(
  submissionId: string,
  postText: string,
  credentials: { accessToken: string; pageId: string }
): Promise<{ success: boolean; log: any }> {
  const { accessToken, pageId } = credentials;

  try {
    // Instagram Graph API: Create a media container (caption-only post = carousel not needed for text)
    // For text-based posts, we create a photo post with a placeholder image
    // Instagram requires an image_url for publishing, so we use the logo
    const imageUrl = "https://promotemymemes.lovable.app/placeholder.svg";

    // Step 1: Create media container
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: postText,
          access_token: accessToken,
        }),
      }
    );
    const createData = await createRes.json();

    if (!createRes.ok || !createData.id) {
      return {
        success: false,
        log: {
          token_submission_id: submissionId,
          platform: "instagram",
          action_type: "post",
          status: "failed",
          error_message: JSON.stringify(createData.error || createData),
          response_payload: createData,
          executed_at: new Date().toISOString(),
        },
      };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: createData.id,
          access_token: accessToken,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishRes.ok && publishData.id) {
      return {
        success: true,
        log: {
          token_submission_id: submissionId,
          platform: "instagram",
          action_type: "post",
          status: "delivered",
          external_id: publishData.id,
          external_url: `https://www.instagram.com/p/${publishData.id}/`,
          response_payload: publishData,
          executed_at: new Date().toISOString(),
        },
      };
    } else {
      return {
        success: false,
        log: {
          token_submission_id: submissionId,
          platform: "instagram",
          action_type: "post",
          status: "failed",
          error_message: JSON.stringify(publishData.error || publishData),
          response_payload: publishData,
          executed_at: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    return {
      success: false,
      log: {
        token_submission_id: submissionId,
        platform: "instagram",
        action_type: "post",
        status: "failed",
        error_message: String(err),
        executed_at: new Date().toISOString(),
      },
    };
  }
}

// ── Reddit posting (OAuth2 script app) ────────────────────────────────────────

async function postToReddit(
  submissionId: string,
  symbol: string,
  postText: string,
  tokenAddress: string,
  credentials: { clientId: string; clientSecret: string; username: string; password: string; subreddits: string; postDelay: number }
): Promise<{ success: number; failed: number; logs: any[] }> {
  const { clientId, clientSecret, username, password, subreddits, postDelay } = credentials;
  const logs: any[] = [];
  let success = 0, failed = 0;

  // Step 1: Get Reddit OAuth2 access token
  let accessToken: string;
  try {
    const authRes = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "User-Agent": "PromoteMyMemes/1.0",
      },
      body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });
    const authData = await authRes.json();
    if (!authData.access_token) {
      logs.push({
        token_submission_id: submissionId,
        platform: "reddit",
        action_type: "auth",
        status: "failed",
        error_message: JSON.stringify(authData),
        executed_at: new Date().toISOString(),
      });
      return { success: 0, failed: 1, logs };
    }
    accessToken = authData.access_token;
  } catch (err) {
    logs.push({
      token_submission_id: submissionId,
      platform: "reddit",
      action_type: "auth",
      status: "failed",
      error_message: String(err),
      executed_at: new Date().toISOString(),
    });
    return { success: 0, failed: 1, logs };
  }

  // Step 2: Post to each subreddit
  const subList = subreddits.split(",").map(s => s.trim()).filter(Boolean);

  for (const sub of subList) {
    try {
      const title = `$${symbol.toUpperCase()} — Memecoin Alert 🚀`;
      const res = await fetch("https://oauth.reddit.com/api/submit", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "PromoteMyMemes/1.0",
        },
        body: new URLSearchParams({
          sr: sub,
          kind: "self",
          title: title.slice(0, 300),
          text: postText,
          resubmit: "true",
        }).toString(),
      });

      const data = await res.json();
      const postUrl = data?.json?.data?.url;

      if (res.ok && postUrl) {
        success++;
        logs.push({
          token_submission_id: submissionId,
          platform: "reddit",
          action_type: "post",
          status: "delivered",
          external_id: data.json?.data?.id || null,
          external_url: postUrl,
          request_payload: { subreddit: sub },
          response_payload: { url: postUrl },
          executed_at: new Date().toISOString(),
        });
      } else {
        failed++;
        const errMsg = data?.json?.errors?.[0]?.[1] || JSON.stringify(data);
        logs.push({
          token_submission_id: submissionId,
          platform: "reddit",
          action_type: "post",
          status: "failed",
          error_message: errMsg,
          request_payload: { subreddit: sub },
          response_payload: data,
          executed_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      failed++;
      logs.push({
        token_submission_id: submissionId,
        platform: "reddit",
        action_type: "post",
        status: "failed",
        error_message: String(err),
        request_payload: { subreddit: sub },
        executed_at: new Date().toISOString(),
      });
    }

    // Respect post delay between subreddits (convert minutes to ms, min 5s)
    await new Promise(r => setTimeout(r, Math.max(5000, postDelay * 60000)));
  }

  return { success, failed, logs };
}

// ── Structured formatters ─────────────────────────────────────────────────────

function shortenCA(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmtStructuredPost(symbol: string, address: string, platform: string, hook: string): string {
  const sym = symbol.toUpperCase();
  if (platform.toLowerCase() === "telegram") {
    return [
      `🔥 ${hook}`,
      "",
      `Name: $${sym}`,
      "",
      address,
      "",
      `[ CHART ] [ HOLDERS ] [ CHECK ]`,
    ].join("\n");
  }
  if (platform.toLowerCase() === "discord") {
    return [
      `🔥 ${hook}`,
      "",
      `**$${sym}**`,
      "",
      `CA:`,
      `\`${address}\``,
      "",
      `Links:`,
      `[Chart](https://dexscreener.com/solana/${address}) | [Holders](https://solscan.io/token/${address}) | Check`,
    ].join("\n");
  }
  if (platform.toLowerCase() === "instagram") {
    return [
      `🔥 ${hook}`,
      "",
      `$${sym}`,
      `CA: ${shortenCA(address)}`,
      "",
      `#memecoin #solana #crypto #${sym.toLowerCase()} #pumpfun`,
    ].join("\n");
  }
  if (platform.toLowerCase() === "reddit") {
    return [
      `## 🔥 ${hook}`,
      "",
      `**$${sym}**`,
      "",
      `Contract Address: \`${address}\``,
      "",
      `[Chart](https://dexscreener.com/solana/${address}) | [Holders](https://solscan.io/token/${address})`,
      "",
      `*Promoted via PromoteMyMemes. DYOR!*`,
    ].join("\n");
  }
  // Twitter - max 280 chars
  const ca = shortenCA(address);
  const post = `${hook}\n\nCA: ${ca}\n\n#Solana #Memecoins`;
  return post.slice(0, 280);
}

// ── Fetch live token data from DexScreener ───────────────────────────────────

async function fetchTokenData(address: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;
    const hypeLines = [
      "Stealth launch 🚀", "Whales accumulating 🐳", "Trending on Dexscreener 📈",
      "Community growing fast 🔥", "Diamond hands only 💎", "Early alpha detected 🧠",
    ];
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

function buildFallbackData(symbol: string, address: string, name?: string): Record<string, string> {
  return {
    TOKEN_NAME: name || symbol,
    TOKEN_SYMBOL: symbol,
    TOKEN_ADDRESS: address,
    MARKET_CAP: "N/A",
    LIQUIDITY: "N/A",
    VOLUME_24H: "N/A",
    HOLDERS: "N/A",
    AUTO_HYPE_LINE: "Stealth launch 🚀",
    TOKEN_IMAGE_URL: `https://dd.dexscreener.com/ds-data/tokens/solana/${address}.png`,
    DEXSCREENER_URL: `https://dexscreener.com/solana/${address}`,
    BUY_LINK: `https://jup.ag/swap/SOL-${address}`,
  };
}

// ── Apply admin message template ──────────────────────────────────────────────

function applyTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, val] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }
  return result;
}

// ── AI content generation ─────────────────────────────────────────────────────

async function generateAIPost(symbol: string, address: string, platform: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const platLower = platform.toLowerCase();
  const maxChars: Record<string, string> = {
    telegram: "2 lines max",
    twitter: "1 line max, under 60 characters",
    discord: "1-2 lines max",
    instagram: "2 lines max, include relevant hashtags",
    reddit: "2-3 lines, informative tone",
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a professional crypto alpha analyst. Generate ONLY a hook line for a structured promotion post.

RULES:
- Output ONLY the hook text, nothing else
- Tone: clean, alpha-style, knowledgeable
- NEVER use: "100x gem", "don't miss", "moon now", "moonshot", "guaranteed"
- PREFER: "Steady accumulation with clean volume", "Early momentum building", "Notable buyer activity on-chain"
- Length: ${maxChars[platLower] || maxChars.telegram}
- No hashtags, no CA, no links — those are added automatically`
          },
          {
            role: "user",
            content: `Generate a ${platform} hook for $${symbol} (Solana token). Just the hook line.`
          }
        ],
        max_tokens: 80,
        temperature: 0.7,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const hook = data.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") || null;
    if (!hook) return null;
    return fmtStructuredPost(symbol, address, platform, hook);
  } catch {
    return null;
  }
}

const FALLBACK_HOOKS: Record<string, string[]> = {
  telegram: [
    "Fresh alpha — volume picking up with solid buy pressure.",
    "Noteworthy on-chain activity. Clean chart structure forming.",
    "Early accumulation signals detected. Worth watching.",
  ],
  twitter: [
    "Building momentum on-chain 📊",
    "Clean volume pattern right now 👀",
    "Buyers stepping in — eyes on this",
  ],
  discord: [
    "Interesting volume pattern — buyers are active.",
    "Flagged for notable on-chain activity.",
    "Fresh entry window. Data looks solid.",
  ],
  instagram: [
    "On-chain momentum building 📈",
    "Buyer activity picking up — watching closely",
    "Clean chart setup worth tracking",
  ],
  reddit: [
    "Interesting on-chain activity worth discussing.",
    "Notable volume pattern emerging on this one.",
    "Early signals look promising — here's the data.",
  ],
};

function fallbackPost(symbol: string, address: string, platform: string): string {
  const platLower = platform.toLowerCase();
  const hooks = FALLBACK_HOOKS[platLower] || FALLBACK_HOOKS.telegram;
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  return fmtStructuredPost(symbol, address, platform, `$${symbol.toUpperCase()} — ${hook}`);
}

// ── Generate post text using template or AI ───────────────────────────────────

async function getPostText(
  symbol: string, address: string, platform: string, cfg: Record<string, string>,
  tokenData: Record<string, string>
): Promise<string> {
  // Priority 1: Admin message template
  const templateKey = `msg_template_${platform.toLowerCase()}`;
  if (cfg[templateKey]?.trim()) {
    return applyTemplate(cfg[templateKey], tokenData);
  }

  // Priority 2: AI-generated content
  const aiPost = await generateAIPost(symbol, address, platform);
  if (aiPost) return aiPost;

  // Priority 3: Fallback
  return fallbackPost(symbol, address, platform);
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submissionId, tokenSymbol, tokenAddress, platforms, promotionType } = await req.json();

    if (!submissionId || !tokenAddress) {
      return new Response(JSON.stringify({ error: "Missing submissionId or tokenAddress" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const symbol = tokenSymbol || tokenAddress.slice(0, 6).toUpperCase();
    const requestedPlatforms: string[] = platforms || ["telegram"];

    // Fetch live on-chain data once for placeholder resolution across all platforms
    const liveData = await fetchTokenData(tokenAddress);
    const tokenData = liveData || buildFallbackData(symbol, tokenAddress);
    tokenData.TOKEN_SYMBOL = symbol;
    tokenData.TOKEN_ADDRESS = tokenAddress;
    if (!tokenData.TOKEN_NAME || tokenData.TOKEN_NAME === "Unknown") tokenData.TOKEN_NAME = symbol;

    // Update campaign status to RUNNING
    await supabase.from("token_submissions")
      .update({ campaign_status: "running" })
      .eq("id", submissionId);

    // Load ALL admin settings for credentials + templates
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "telegram_bot_token", "telegram_enabled",
        "discord_enabled",
        "twitter_consumer_key", "twitter_consumer_secret",
        "twitter_access_token", "twitter_access_token_secret", "twitter_enabled",
        "instagram_access_token", "instagram_page_id", "instagram_enabled", "instagram_posts_per_day",
        "reddit_client_id", "reddit_client_secret", "reddit_username", "reddit_password",
        "reddit_enabled", "reddit_subreddits", "reddit_post_delay_minutes",
        "msg_template_telegram", "msg_template_discord", "msg_template_twitter",
        "msg_template_instagram", "msg_template_reddit",
      ]);

    const cfg: Record<string, string> = {};
    settings?.forEach(s => { cfg[s.key] = s.value; });

    const allLogs: any[] = [];
    const results: Record<string, { success: number; failed: number; skipped: string | null }> = {};

    // ── Telegram ──────────────────────────────────────────────────────────────
    if (requestedPlatforms.includes("telegram")) {
      if (cfg.telegram_enabled === "true" && cfg.telegram_bot_token) {
        const postText = await getPostText(symbol, tokenAddress, "telegram", cfg, tokenData);
        const tgResult = await postToTelegram(supabase, submissionId, cfg.telegram_bot_token, postText, tokenAddress);
        allLogs.push(...tgResult.logs);
        results.telegram = { success: tgResult.success, failed: tgResult.failed, skipped: null };

        if (tgResult.success > 0) {
          await supabase.from("social_posts").insert({
            token_submission_id: submissionId,
            platform: "telegram",
            post_text: postText,
            likes: 0, shares: 0, views: 0, reactions: 0,
          });
        }
      } else {
        results.telegram = { success: 0, failed: 0, skipped: "Telegram not configured or disabled" };
        allLogs.push({
          token_submission_id: submissionId,
          platform: "telegram",
          action_type: "skipped",
          status: "not_configured",
          error_message: "Telegram bot token not set or integration disabled",
          executed_at: new Date().toISOString(),
        });
      }
    }

    // ── Discord ───────────────────────────────────────────────────────────────
    if (requestedPlatforms.includes("discord")) {
      if (cfg.discord_enabled === "true") {
        const postText = await getPostText(symbol, tokenAddress, "discord", cfg, tokenData);
        const dcResult = await postToDiscord(supabase, submissionId, symbol, postText, tokenAddress);
        allLogs.push(...dcResult.logs);
        results.discord = { success: dcResult.success, failed: dcResult.failed, skipped: null };

        if (dcResult.success > 0) {
          await supabase.from("social_posts").insert({
            token_submission_id: submissionId,
            platform: "discord",
            post_text: postText,
            likes: 0, shares: 0, views: 0, reactions: 0,
          });
        }
      } else {
        results.discord = { success: 0, failed: 0, skipped: "Discord not configured or disabled" };
        allLogs.push({
          token_submission_id: submissionId,
          platform: "discord",
          action_type: "skipped",
          status: "not_configured",
          error_message: "Discord integration disabled",
          executed_at: new Date().toISOString(),
        });
      }
    }

    // ── Twitter/X ─────────────────────────────────────────────────────────────
    if (requestedPlatforms.includes("twitter")) {
      if (
        cfg.twitter_enabled === "true" &&
        cfg.twitter_consumer_key && cfg.twitter_consumer_secret &&
        cfg.twitter_access_token && cfg.twitter_access_token_secret
      ) {
        const postText = await getPostText(symbol, tokenAddress, "twitter", cfg, tokenData);
        const twResult = await postToTwitter(submissionId, postText, {
          consumerKey: cfg.twitter_consumer_key,
          consumerSecret: cfg.twitter_consumer_secret,
          accessToken: cfg.twitter_access_token,
          accessTokenSecret: cfg.twitter_access_token_secret,
        });
        allLogs.push(twResult.log);
        results.twitter = { success: twResult.success ? 1 : 0, failed: twResult.success ? 0 : 1, skipped: null };

        if (twResult.success) {
          await supabase.from("social_posts").insert({
            token_submission_id: submissionId,
            platform: "twitter",
            post_text: postText,
            likes: 0, shares: 0, views: 0, reactions: 0,
          });
        }
      } else {
        results.twitter = { success: 0, failed: 0, skipped: "Twitter not configured or disabled" };
        allLogs.push({
          token_submission_id: submissionId,
          platform: "twitter",
          action_type: "skipped",
          status: "not_configured",
          error_message: "Twitter API credentials not set or integration disabled",
          executed_at: new Date().toISOString(),
        });
      }
    }

    // ── Instagram ─────────────────────────────────────────────────────────────
    if (requestedPlatforms.includes("instagram")) {
      if (
        cfg.instagram_enabled === "true" &&
        cfg.instagram_access_token && cfg.instagram_page_id
      ) {
        const postText = await getPostText(symbol, tokenAddress, "instagram", cfg, tokenData);
        const igResult = await postToInstagram(submissionId, postText, {
          accessToken: cfg.instagram_access_token,
          pageId: cfg.instagram_page_id,
        });
        allLogs.push(igResult.log);
        results.instagram = { success: igResult.success ? 1 : 0, failed: igResult.success ? 0 : 1, skipped: null };

        if (igResult.success) {
          await supabase.from("social_posts").insert({
            token_submission_id: submissionId,
            platform: "instagram",
            post_text: postText,
            likes: 0, shares: 0, views: 0, reactions: 0,
          });
        }
      } else {
        results.instagram = { success: 0, failed: 0, skipped: "Instagram not configured or disabled" };
        allLogs.push({
          token_submission_id: submissionId,
          platform: "instagram",
          action_type: "skipped",
          status: "not_configured",
          error_message: "Instagram access token or page ID not set, or integration disabled",
          executed_at: new Date().toISOString(),
        });
      }
    }

    // ── Reddit ────────────────────────────────────────────────────────────────
    if (requestedPlatforms.includes("reddit")) {
      if (
        cfg.reddit_enabled === "true" &&
        cfg.reddit_client_id && cfg.reddit_client_secret &&
        cfg.reddit_username && cfg.reddit_password
      ) {
        const postText = await getPostText(symbol, tokenAddress, "reddit", cfg, tokenData);
        const rdResult = await postToReddit(submissionId, symbol, postText, tokenAddress, {
          clientId: cfg.reddit_client_id,
          clientSecret: cfg.reddit_client_secret,
          username: cfg.reddit_username,
          password: cfg.reddit_password,
          subreddits: cfg.reddit_subreddits || "CryptoMoonShots",
          postDelay: parseInt(cfg.reddit_post_delay_minutes || "30", 10),
        });
        allLogs.push(...rdResult.logs);
        results.reddit = { success: rdResult.success, failed: rdResult.failed, skipped: null };

        if (rdResult.success > 0) {
          await supabase.from("social_posts").insert({
            token_submission_id: submissionId,
            platform: "reddit",
            post_text: postText,
            likes: 0, shares: 0, views: 0, reactions: 0,
          });
        }
      } else {
        results.reddit = { success: 0, failed: 0, skipped: "Reddit not configured or disabled" };
        allLogs.push({
          token_submission_id: submissionId,
          platform: "reddit",
          action_type: "skipped",
          status: "not_configured",
          error_message: "Reddit API credentials not set or integration disabled",
          executed_at: new Date().toISOString(),
        });
      }
    }

    // Store all execution logs
    if (allLogs.length > 0) {
      const { error: logErr } = await supabase.from("campaign_execution_logs").insert(allLogs);
      if (logErr) {
        const stripped = allLogs.map(l => ({ ...l, token_submission_id: null }));
        await supabase.from("campaign_execution_logs").insert(stripped);
      }
    }

    // Store bot activity with real results
    const botActivities = allLogs
      .filter(l => l.status === "delivered")
      .map(l => ({
        token_submission_id: submissionId,
        token_symbol: symbol,
        platform: l.platform === "twitter" ? "Twitter/X" : l.platform === "telegram" ? "Telegram" : l.platform === "instagram" ? "Instagram" : l.platform === "reddit" ? "Reddit" : "Discord",
        action_type: l.action_type,
        action_detail: l.external_url
          ? `Posted: ${l.external_url}`
          : `Delivered to ${l.request_payload?.group_name || l.request_payload?.server || l.request_payload?.subreddit || l.platform}`,
        status: "delivered",
      }));

    if (botActivities.length > 0) {
      await supabase.from("bot_activity_log").insert(botActivities);
    }

    // Update campaign status
    const totalSuccess = Object.values(results).reduce((s, r) => s + r.success, 0);
    const campaignStatus = totalSuccess > 0 ? "running" : "failed";
    await supabase.from("token_submissions")
      .update({ campaign_status: campaignStatus })
      .eq("id", submissionId);

    return new Response(JSON.stringify({ success: true, results, logsCount: allLogs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("execute-campaign error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
