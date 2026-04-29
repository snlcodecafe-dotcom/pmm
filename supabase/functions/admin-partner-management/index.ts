import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

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

  if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN secret");

  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return await r.json();
}

async function assertPassword(supabase: any, password?: string) {
  if (!password) throw new Error("Unauthorized");

  const { data: pwRow, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "admin_password")
    .single();

  if (error || !pwRow || (pwRow as any).value !== password) {
    throw new Error("Unauthorized");
  }
}

function normalizeChannelId(rawValue?: string | null, fallbackLink?: string | null) {
  if (rawValue && rawValue.trim()) {
    const value = rawValue.trim();
    return value.startsWith("@") || /^-?\d+$/.test(value) ? value : `@${value}`;
  }

  if (fallbackLink) {
    const match = fallbackLink.match(/t\.me\/([^/?]+)/i);
    if (match?.[1]) return `@${match[1].replace(/^@/, "")}`;
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { action, password, userId, makeAdmin, channelId, status, rejectionReason } = body ?? {};

    await assertPassword(supabase, password);

    if (action === "load") {
      const [profilesRes, rolesRes, partnersRes, earningsRes, launchesRes, submissionsRes, walletsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("partner_channels").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("partner_earnings").select("id, partner_user_id, channel_id, commission_sol, payout_status, created_at, referral_code").order("created_at", { ascending: false }).limit(1000),
        supabase.from("token_launches").select("id, user_id, token_name, token_symbol, mint_address, created_at, token_created, metadata_attached, liquidity_added, liquidity_locked, promotion_started").order("created_at", { ascending: false }).limit(1000),
        supabase.from("token_submissions").select("id, user_id, token_name, token_symbol, token_address, status, campaign_status, promotion_type, created_at, wallet_address").order("created_at", { ascending: false }).limit(1000),
        supabase.from("user_wallets").select("id, user_id, wallet_address, is_primary, verified_at").order("verified_at", { ascending: false }).limit(1000),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (partnersRes.error) throw partnersRes.error;
      if (earningsRes.error) throw earningsRes.error;
      if (launchesRes.error) throw launchesRes.error;
      if (submissionsRes.error) throw submissionsRes.error;
      if (walletsRes.error) throw walletsRes.error;

      return new Response(JSON.stringify({
        profiles: profilesRes.data ?? [],
        roles: rolesRes.data ?? [],
        partners: partnersRes.data ?? [],
        earnings: earningsRes.data ?? [],
        launches: launchesRes.data ?? [],
        submissions: submissionsRes.data ?? [],
        wallets: walletsRes.data ?? [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-role") {
      if (!userId || typeof makeAdmin !== "boolean") throw new Error("Missing role payload");

      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").upsert(
          { user_id: userId, role: "admin" },
          { onConflict: "user_id,role" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
        if (error) throw error;
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-partner-status") {
      if (!channelId || !status) throw new Error("Missing channel status payload");

      const { data: channel, error: channelFetchError } = await supabase
        .from("partner_channels")
        .select("*")
        .eq("id", channelId)
        .single();

      if (channelFetchError || !channel) throw new Error("Partner channel not found");

      const { error } = await supabase
        .from("partner_channels")
        .update({
          verification_status: status,
          verified_at: status === "verified" ? new Date().toISOString() : null,
          rejection_reason: status === "rejected" ? rejectionReason || "Rejected by admin" : null,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", channelId);

      if (error) throw error;

      if (status === "verified") {
        if (channel.telegram_channel_id) {
          const { data: existingTelegram } = await supabase
            .from("telegram_groups")
            .select("id")
            .eq("chat_id", channel.telegram_channel_id)
            .maybeSingle();

          if (existingTelegram?.id) {
            await supabase.from("telegram_groups").update({
              group_name: channel.telegram_channel_name || channel.telegram_channel_id,
              category: "partner",
              is_active: true,
            }).eq("id", existingTelegram.id);
          } else {
            await supabase.from("telegram_groups").insert({
              chat_id: channel.telegram_channel_id,
              group_name: channel.telegram_channel_name || channel.telegram_channel_id,
              category: "partner",
              is_active: true,
            });
          }
        }

        if (channel.discord_invite_link && channel.discord_server_name) {
          const { data: existingWebhook } = await supabase
            .from("discord_webhooks")
            .select("id")
            .eq("webhook_url", channel.discord_invite_link)
            .maybeSingle();

          if (existingWebhook?.id) {
            await supabase.from("discord_webhooks").update({
              server_name: channel.discord_server_name,
              channel_name: channel.telegram_channel_name || "partner",
              is_active: true,
            }).eq("id", existingWebhook.id);
          } else {
            await supabase.from("discord_webhooks").insert({
              webhook_url: channel.discord_invite_link,
              server_name: channel.discord_server_name,
              channel_name: channel.telegram_channel_name || "partner",
              is_active: true,
            });
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "audit-channel") {
      if (!channelId) throw new Error("Missing channel id");

      const { data: channel, error: channelError } = await supabase
        .from("partner_channels")
        .select("*")
        .eq("id", channelId)
        .single();

      if (channelError || !channel) throw new Error("Channel not found");

      const chatId = normalizeChannelId(channel.telegram_channel_id, channel.telegram_channel_link);
      if (!chatId) throw new Error("Channel id is missing, add a Telegram channel id or link first");

      const chat = await tg("getChat", { chat_id: chatId });
      if (!chat.ok) {
        await supabase.from("partner_channels").update({
          bot_is_admin: false,
          last_checked_at: new Date().toISOString(),
          rejection_reason: chat.description || "Channel not found or bot has no access",
        }).eq("id", channelId);

        throw new Error(chat.description || "Channel not found or bot has no access");
      }

      const countRes = await tg("getChatMemberCount", { chat_id: chatId });
      const subs = countRes.ok ? Number(countRes.result || 0) : 0;

      const me = await tg("getMe", {});
      if (!me.ok) throw new Error("Bot misconfigured");

      const admins = await tg("getChatAdministrators", { chat_id: chatId });
      const botIsAdmin = admins.ok && Array.isArray(admins.result) && admins.result.some((entry: { user?: { id?: number } }) => entry.user?.id === me.result.id);
      const tier = tierFor(subs);

      const nextStatus = botIsAdmin && subs >= 1000 ? "verified" : subs < 1000 ? "pending" : "pending";
      const nextReason = !botIsAdmin
        ? `Bot @${me.result.username} is not admin on this channel`
        : subs < 1000
          ? "Channel is below 1,000 subscribers"
          : null;

      const payload = {
        telegram_channel_name: channel.telegram_channel_name || chat.result.title || null,
        telegram_channel_link: channel.telegram_channel_link || (chat.result.username ? `https://t.me/${chat.result.username}` : null),
        subscriber_count: subs,
        tier_percent: tier,
        bot_is_admin: botIsAdmin,
        verification_status: nextStatus,
        rejection_reason: nextReason,
        last_checked_at: new Date().toISOString(),
        verified_at: nextStatus === "verified" ? new Date().toISOString() : null,
      };

      const { data: updated, error: updateError } = await supabase
        .from("partner_channels")
        .update(payload)
        .eq("id", channelId)
        .select()
        .single();

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ ok: true, channel: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: err instanceof Error && err.message === "Unauthorized" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});