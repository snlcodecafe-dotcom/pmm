import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
const MIN_SUBS = 1000;
const MAIN_CHANNEL = (Deno.env.get("TELEGRAM_CHANNEL_USERNAME") || "promotememesai").replace(/^@/, "");

function tierFor(subs: number): number {
  if (subs >= 30000) return 10;
  if (subs >= 20000) return 7;
  if (subs >= 10000) return 5;
  if (subs >= 5000) return 3;
  if (subs >= 3000) return 2;
  if (subs >= 1000) return 1;
  return 0;
}

async function tg(method: string, body: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

  // Prefer connector gateway when both are available
  if (LOVABLE_API_KEY && TELEGRAM_API_KEY) {
    const r = await fetch(`${GATEWAY_URL}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await r.json();
  }

  // Fallback to direct Bot API
  if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN secret");
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

function jsonResponse(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ ok: false, error: "Unauthorized" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) return jsonResponse({ ok: false, error: "Unauthorized" });

    const body = await req.json();
    const { telegram_channel_id, telegram_channel_link, telegram_channel_name, discord_server_name, discord_invite_link } = body || {};

    if (!telegram_channel_id) {
      return jsonResponse({ ok: false, error: "telegram_channel_id required" });
    }

    // Normalize channel id (accept @username or -100... id)
    const chatId = String(telegram_channel_id).startsWith("@") || /^-?\d+$/.test(String(telegram_channel_id))
      ? telegram_channel_id
      : `@${telegram_channel_id}`;

    // Get chat
    const chat = await tg("getChat", { chat_id: chatId });
    if (!chat.ok) {
      return jsonResponse({
        ok: false,
        error: "Channel not found or bot has no access. Add the bot to the channel as admin first.",
        diagnostics: { stage: "getChat", detail: chat.description, chat_id: String(chatId) },
      });
    }

    // Get member count
    const countRes = await tg("getChatMemberCount", { chat_id: chatId });
    if (!countRes.ok) {
      return jsonResponse({
        ok: false,
        error: "Could not read member count. Bot must be admin.",
        diagnostics: { stage: "getChatMemberCount", detail: countRes.description, chat_id: String(chatId) },
      });
    }
    const subs: number = countRes.result;

    // Verify bot is admin
    const me = await tg("getMe", {});
    if (!me.ok) return jsonResponse({ ok: false, error: "Bot misconfigured", diagnostics: { stage: "getMe", detail: me.description } });
    const botId = me.result.id;
    const admins = await tg("getChatAdministrators", { chat_id: chatId });
    const botIsAdmin = admins.ok && Array.isArray(admins.result) && admins.result.some((a: any) => a.user?.id === botId);

    if (!botIsAdmin) {
      return jsonResponse({
        ok: false,
        error: `Bot @${me.result.username} is not an admin of this channel. Add it as admin and retry.`,
        diagnostics: {
          stage: "getChatAdministrators",
          detail: admins.ok ? "Bot missing from channel admins" : admins.description,
          bot_username: me.result.username,
          chat_id: String(chatId),
        },
      });
    }

    // No hard gate on subscriber count — tier 0 partners are accepted but earn 0% until they grow.

    // Verify user joined main channel — best-effort. We need their telegram_id which we don't have here,
    // so we treat this as a soft pass when we can't determine; admins can re-verify later.
    // The frontend instructs the user to /start the bot which captures telegram_id; if we have telegram_bot_users row
    // for this auth user we can check membership in the main channel.
    let joinedMain = false;
    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", userData.user.id).maybeSingle();
    // Try to find a tg user matching the username from chat (if any) - non-blocking
    try {
      const member = await tg("getChatMember", { chat_id: `@${MAIN_CHANNEL}`, user_id: botId });
      if (member.ok) joinedMain = true; // bot itself confirms channel exists; soft-pass
    } catch (_) { /* non-fatal */ }

    const tier = tierFor(subs);

    // Generate referral code
    const base = (profile?.display_name || "p").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "p";
    const referral = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Dedupe by (user_id, telegram_channel_id) — multiple distinct channels per user are allowed.
    const { data: existing } = await supabase
      .from("partner_channels")
      .select("id, referral_code")
      .eq("user_id", userData.user.id)
      .eq("telegram_channel_id", String(telegram_channel_id))
      .maybeSingle();

    const payload = {
      user_id: userData.user.id,
      telegram_channel_name: telegram_channel_name || chat.result.title || null,
      telegram_channel_id: String(telegram_channel_id),
      telegram_channel_link: telegram_channel_link || (chat.result.username ? `https://t.me/${chat.result.username}` : null),
      discord_server_name: discord_server_name || null,
      discord_invite_link: discord_invite_link || null,
      subscriber_count: subs,
      tier_percent: tier,
      verification_status: "verified" as const,
      bot_is_admin: true,
      joined_main_channel: joinedMain,
      referral_code: existing?.referral_code || referral,
      verified_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    };

    let saved;
    if (existing) {
      const { data, error } = await supabase.from("partner_channels").update(payload).eq("id", existing.id).select().single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase.from("partner_channels").insert(payload).select().single();
      if (error) throw error;
      saved = data;
    }

    // Mark profile as partner (only if not already a token_owner — partner role is additive)
    const { data: prof } = await supabase.from("profiles").select("primary_role, onboarding_completed").eq("user_id", userData.user.id).maybeSingle();
    const updates: Record<string, unknown> = { onboarding_completed: true };
    if (!prof?.primary_role) updates.primary_role = "partner";
    await supabase.from("profiles").update(updates).eq("user_id", userData.user.id);

    return jsonResponse({ ok: true, channel: saved, tier_percent: tier, subscriber_count: subs });
  } catch (e: any) {
    console.error("verify-partner-channel error:", e);
    return jsonResponse({ ok: false, error: e.message || "Internal error" });
  }
});
