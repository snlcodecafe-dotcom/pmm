// Auto Promote Engine — generates and dispatches scheduled posts.
// Modes:
//   - default (cron): generate today's posts if missing, dispatch any pending due posts
//   - { action: "generate" }: force-regenerate today's posts
//   - { action: "dispatch" }: only dispatch due posts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORTED = ["telegram", "discord", "twitter", "instagram"] as const;
type Platform = typeof SUPPORTED[number];

const TEMPLATES = [
  "{hype} {brand} is how meme creators actually launch and promote on Solana. {cta}",
  "{hype}\n\nLaunch your token, lock liquidity, and promote across Telegram, Twitter, Discord — all in one place. {cta}",
  "Tired of dead launches? {brand} automates promotion the moment your token goes live. {hype} {cta}",
  "{brand} → token launcher + multi-channel promotion engine for Solana memes. {hype} {cta}",
  "{hype} Real partners. Real reach. Real results. {brand}. {cta}",
  "Stop spamming groups manually. {brand} schedules, posts, and tracks every promo. {cta}",
  "{hype}\n\n• Launch SPL tokens\n• Lock LP\n• Auto-promote\n• Track engagement\n\n{brand} → {cta}",
  "Your meme deserves better than 12 views. {brand} fixes that. {hype} {cta}",
];

const HYPE = [
  "🚀 The grind never sleeps.",
  "🔥 Built different.",
  "💎 Diamond hands only.",
  "⚡ Speed wins on Solana.",
  "🦍 Apes assemble.",
  "📈 Up only mindset.",
  "🎯 Precision promotion.",
  "🌙 To the moon, properly.",
  "🧠 Smart launches outlive hype cycles.",
  "💥 Make noise the right way.",
];

const CTAS = [
  "👉 promotemymemes.com",
  "Try it free → promotemymemes.com",
  "Launch now: promotemymemes.com",
  "DM the bot: @promotememesai_bot",
  "Join the movement → promotemymemes.com",
];

const BRAND = ["PromoteMyMemes", "PMM", "promotemymemes.com"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateBaseContent(): string {
  const tpl = pick(TEMPLATES);
  return tpl
    .replaceAll("{hype}", pick(HYPE))
    .replaceAll("{brand}", pick(BRAND))
    .replaceAll("{cta}", pick(CTAS));
}

function formatForPlatform(base: string, platform: Platform): string {
  if (platform === "twitter") {
    let t = base.replace(/\n+/g, " ").trim();
    if (t.length > 270) t = t.slice(0, 267) + "...";
    return t;
  }
  if (platform === "telegram") {
    // simple HTML emphasis on first line
    const lines = base.split("\n");
    lines[0] = `<b>${lines[0]}</b>`;
    return lines.join("\n");
  }
  if (platform === "discord") {
    const lines = base.split("\n");
    lines[0] = `**${lines[0]}**`;
    return lines.join("\n");
  }
  // instagram – plain caption with extra hashtags
  return `${base}\n\n#solana #memecoin #crypto #defi #promotemymemes`;
}

function pickRandomTimes(count: number, startTime: string, endTime: string): Date[] {
  // schedule for "today" in UTC; if window already past, schedule for tomorrow
  const now = new Date();
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = new Date(now);
  start.setUTCHours(sh, sm, 0, 0);
  let end = new Date(now);
  end.setUTCHours(eh, em, 0, 0);
  if (end <= start) end = new Date(end.getTime() + 24 * 3600 * 1000);
  if (end <= now) {
    start.setUTCDate(start.getUTCDate() + 1);
    end.setUTCDate(end.getUTCDate() + 1);
  }
  const span = end.getTime() - start.getTime();
  const times: Date[] = [];
  for (let i = 0; i < count; i++) {
    times.push(new Date(start.getTime() + Math.random() * span));
  }
  return times.sort((a, b) => a.getTime() - b.getTime());
}

type Creds = Record<string, Record<string, any>>;

async function loadCreds(supabase: any): Promise<Creds> {
  const { data } = await supabase.from("platform_credentials").select("platform, credentials, is_enabled");
  const out: Creds = {};
  for (const row of data ?? []) {
    if (row.is_enabled) out[row.platform] = row.credentials ?? {};
  }
  return out;
}

async function dispatchTelegram(content: string, _imageUrl: string | null, creds: Creds): Promise<{ ok: boolean; ref?: string; err?: string }> {
  const c = creds["telegram"] ?? {};
  const token = c.bot_token || Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = c.channel_id || Deno.env.get("TELEGRAM_CHANNEL_ID");
  if (!token || !chatId) return { ok: false, err: "Telegram credentials not configured in Admin Panel" };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: "HTML", disable_web_page_preview: false }),
  });
  const j = await r.json();
  if (!j.ok) return { ok: false, err: JSON.stringify(j).slice(0, 400) };
  return { ok: true, ref: String(j.result?.message_id ?? "") };
}

async function dispatchDiscord(content: string, imageUrl: string | null, supabase: any): Promise<{ ok: boolean; ref?: string; err?: string }> {
  const { data: hooks } = await supabase
    .from("discord_webhooks")
    .select("webhook_url")
    .eq("is_active", true)
    .limit(10);
  if (!hooks || hooks.length === 0) return { ok: false, err: "no active discord webhooks" };
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  const r = await fetch(hook.webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, embeds: imageUrl ? [{ image: { url: imageUrl } }] : undefined }),
  });
  if (!r.ok) return { ok: false, err: `discord ${r.status}: ${(await r.text()).slice(0, 300)}` };
  return { ok: true };
}

async function dispatchTwitter(_content: string): Promise<{ ok: boolean; ref?: string; err?: string }> {
  const ck = Deno.env.get("TWITTER_CONSUMER_KEY");
  const cs = Deno.env.get("TWITTER_CONSUMER_SECRET");
  const at = Deno.env.get("TWITTER_ACCESS_TOKEN");
  const ats = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET");
  if (!ck || !cs || !at || !ats) return { ok: false, err: "missing Twitter credentials (TWITTER_CONSUMER_KEY/SECRET, TWITTER_ACCESS_TOKEN/SECRET)" };
  // Stub: real OAuth1 signing required to actually post; mark as failed so admin sees what's missing.
  return { ok: false, err: "Twitter posting not implemented yet — credentials present, OAuth1 signing TODO" };
}

async function dispatchInstagram(_content: string, imageUrl: string | null): Promise<{ ok: boolean; ref?: string; err?: string }> {
  const token = Deno.env.get("INSTAGRAM_ACCESS_TOKEN");
  const igUserId = Deno.env.get("INSTAGRAM_USER_ID");
  if (!token || !igUserId) return { ok: false, err: "missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID" };
  if (!imageUrl) return { ok: false, err: "instagram requires image_url" };
  return { ok: false, err: "Instagram posting not implemented yet — credentials present, Graph API integration TODO" };
}

async function dispatchOne(platform: Platform, content: string, imageUrl: string | null, supabase: any) {
  if (platform === "telegram") return dispatchTelegram(content, imageUrl);
  if (platform === "discord") return dispatchDiscord(content, imageUrl, supabase);
  if (platform === "twitter") return dispatchTwitter(content);
  if (platform === "instagram") return dispatchInstagram(content, imageUrl);
  return { ok: false, err: `unsupported platform ${platform}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty for cron */ }
  const action: "generate" | "dispatch" | "auto" = body.action ?? "auto";

  // Load settings
  const { data: settings, error: sErr } = await supabase
    .from("automation_settings").select("*").eq("id", 1).single();
  if (sErr || !settings) {
    return new Response(JSON.stringify({ error: "settings not found", details: sErr }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!settings.is_enabled && action === "auto") {
    return new Response(JSON.stringify({ ok: true, skipped: "automation disabled" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const platforms = (settings.platforms ?? []).filter((p: string) => SUPPORTED.includes(p as Platform)) as Platform[];
  const todayKey = new Date().toISOString().slice(0, 10);
  let generated = 0;

  // ---- GENERATE ----
  if (action === "generate" || (action === "auto" && settings.last_generated_for !== todayKey)) {
    if (platforms.length === 0) {
      return new Response(JSON.stringify({ error: "no platforms selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const times = pickRandomTimes(settings.posts_per_day, settings.start_time, settings.end_time);
    const rows: any[] = [];

    for (const t of times) {
      // Ensure unique base content per slot; rotate platforms per slot for variety
      const platformsForSlot = shuffle(platforms);
      let attempts = 0;
      let base = generateBaseContent();
      while (attempts < 5) {
        const exists = rows.some((r) => r._base === base);
        if (!exists) break;
        base = generateBaseContent();
        attempts++;
      }
      for (const p of platformsForSlot) {
        const content = formatForPlatform(base, p);
        const hash = await sha256(`${p}:${content}`);
        rows.push({
          _base: base,
          content,
          content_hash: hash,
          image_url: p === "instagram" ? settings.default_image_url : null,
          platform: p,
          scheduled_time: t.toISOString(),
          status: "pending",
        });
      }
    }

    const cleanRows = rows.map(({ _base, ...rest }) => rest);
    const { error: insErr, data: insData } = await supabase
      .from("generated_posts")
      .upsert(cleanRows, { onConflict: "platform,content_hash", ignoreDuplicates: true })
      .select("id");
    if (insErr) {
      return new Response(JSON.stringify({ error: "insert failed", details: insErr }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    generated = insData?.length ?? 0;

    await supabase.from("automation_settings")
      .update({ last_generated_for: todayKey, updated_at: new Date().toISOString() })
      .eq("id", 1);
  }

  // ---- DISPATCH ----
  let dispatched = 0;
  let failed = 0;
  if (action !== "generate") {
    if (!settings.is_enabled) {
      return new Response(JSON.stringify({ ok: true, generated, skipped: "disabled before dispatch" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: due } = await supabase
      .from("generated_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_time", new Date().toISOString())
      .order("scheduled_time", { ascending: true })
      .limit(20);

    for (const post of due ?? []) {
      // Re-check toggle each iteration (real-time off)
      const { data: live } = await supabase.from("automation_settings").select("is_enabled").eq("id", 1).single();
      if (!live?.is_enabled) break;

      let imageUrl = post.image_url;
      if (post.platform === "instagram" && !imageUrl) imageUrl = settings.default_image_url;

      try {
        const res = await dispatchOne(post.platform as Platform, post.content, imageUrl, supabase);
        if (res.ok) {
          await supabase.from("generated_posts").update({
            status: "posted", posted_at: new Date().toISOString(), external_ref: res.ref ?? null, error_message: null,
          }).eq("id", post.id);
          dispatched++;
        } else {
          await supabase.from("generated_posts").update({
            status: "failed", error_message: res.err ?? "unknown error",
          }).eq("id", post.id);
          failed++;
        }
      } catch (e) {
        await supabase.from("generated_posts").update({
          status: "failed", error_message: String(e).slice(0, 500),
        }).eq("id", post.id);
        failed++;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, generated, dispatched, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
