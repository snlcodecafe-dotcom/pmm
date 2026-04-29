import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

function getTelegramApi() {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  return `${TELEGRAM_API}${token}`;
}

function getChannelUsername(): string {
  return Deno.env.get("TELEGRAM_CHANNEL_USERNAME") || "@promotememesai";
}

function getChannelId(): string {
  return Deno.env.get("TELEGRAM_CHANNEL_ID") || "";
}

async function telegramCall(method: string, body: any) {
  const api = getTelegramApi();
  const res = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error (${method}):`, data);
  }
  return data;
}

async function checkChannelMembership(userId: number): Promise<boolean> {
  const channelId = getChannelId();
  if (!channelId) return false;

  try {
    const result = await telegramCall("getChatMember", {
      chat_id: channelId,
      user_id: userId,
    });

    if (!result.ok) return false;
    const status = result.result?.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch {
    return false;
  }
}

async function sendJoinPrompt(chatId: number) {
  const channelUsername = getChannelUsername();
  await telegramCall("sendMessage", {
    chat_id: chatId,
    text: `🚨 *Access Required*\n\nJoin our channel to unlock exclusive alpha, token calls, and viral content!\n\n📢 Join now to get:\n• 🔥 Early token alerts\n• 🧠 AI-powered alpha\n• 💎 Exclusive meme content\n• 📊 Real-time market signals`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 Join Channel", url: `https://t.me/${channelUsername.replace("@", "")}` }],
        [{ text: "✅ I Joined — Verify", callback_data: "verify_join" }],
      ],
    },
  });
}

async function sendWelcomeMessage(chatId: number, firstName: string) {
  await telegramCall("sendMessage", {
    chat_id: chatId,
    text: `🚀 *Welcome to PromoteMyMemes AI, ${firstName}!*\n\nYou're now part of the most powerful memecoin growth engine on Solana.\n\n🔥 *What you can do:*\n• /promote — Submit a token for promotion\n• /trending — See trending tokens\n• /alpha — Get latest alpha calls\n• /stats — Your referral stats\n\n💰 *Earn rewards:*\nShare your referral link and earn bonus credits for every friend who joins!\n\nLet's make your token go viral! 🎯`,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Promote a Token", url: "https://promotemymemes.com/campaign-engine" }],
        [{ text: "📊 View Trending", url: "https://promotemymemes.com/trending-memecoins" }],
      ],
    },
  });
}

function generateReferralCode(telegramId: number): string {
  return `PMM${telegramId.toString(36).toUpperCase()}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, update } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Handle direct API calls from admin
    if (action === "process_update" && update) {
      return await processUpdate(update, supabase);
    }

    // Handle webhook-style updates (array)
    if (Array.isArray(body.updates)) {
      for (const upd of body.updates) {
        await processUpdate(upd, supabase);
      }
      return new Response(JSON.stringify({ ok: true, processed: body.updates.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single update
    if (body.message || body.callback_query) {
      return await processUpdate(body, supabase);
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Bot handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processUpdate(update: any, supabase: any) {
  // Handle callback queries (inline button presses)
  if (update.callback_query) {
    const cb = update.callback_query;
    const userId = cb.from.id;
    const chatId = cb.message?.chat?.id;
    const data = cb.data;

    if (data === "verify_join") {
      const isMember = await checkChannelMembership(userId);

      if (isMember) {
        // Update DB
        await supabase
          .from("telegram_bot_users")
          .update({ joined_channel: true, updated_at: new Date().toISOString() })
          .eq("telegram_id", userId);

        await telegramCall("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: "✅ Verified! Welcome aboard!",
          show_alert: true,
        });

        await sendWelcomeMessage(chatId, cb.from.first_name || "Degen");
      } else {
        await telegramCall("answerCallbackQuery", {
          callback_query_id: cb.id,
          text: "❌ You haven't joined the channel yet. Please join first!",
          show_alert: true,
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Handle messages
  if (update.message) {
    const msg = update.message;
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const text = msg.text || "";
    const firstName = msg.from.first_name || "Anon";
    const username = msg.from.username || null;

    // Upsert user
    const referralCode = generateReferralCode(userId);
    let referredBy: string | null = null;

    // Check for /start with referral
    if (text.startsWith("/start ")) {
      referredBy = text.split(" ")[1] || null;
    }

    const { data: existingUser } = await supabase
      .from("telegram_bot_users")
      .select("*")
      .eq("telegram_id", userId)
      .single();

    if (!existingUser) {
      await supabase.from("telegram_bot_users").insert({
        telegram_id: userId,
        username,
        first_name: firstName,
        referral_code: referralCode,
        referred_by: referredBy,
        joined_channel: false,
      });

      // Track referral
      if (referredBy) {
        await supabase.rpc("increment_referral_count", { ref_code: referredBy }).catch(() => {});
      }
    }

    // FORCED CHANNEL JOIN CHECK
    const isMember = await checkChannelMembership(userId);

    if (!isMember) {
      if (existingUser) {
        await supabase
          .from("telegram_bot_users")
          .update({ joined_channel: false })
          .eq("telegram_id", userId);
      }
      await sendJoinPrompt(chatId);
      return new Response(JSON.stringify({ ok: true, action: "join_prompt" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User IS a member — update status
    if (existingUser && !existingUser.joined_channel) {
      await supabase
        .from("telegram_bot_users")
        .update({ joined_channel: true, updated_at: new Date().toISOString() })
        .eq("telegram_id", userId);
    }

    // Handle commands
    if (text === "/start" || text.startsWith("/start ")) {
      await sendWelcomeMessage(chatId, firstName);
    } else if (text === "/promote") {
      await telegramCall("sendMessage", {
        chat_id: chatId,
        text: "🚀 *Promote Your Token*\n\nVisit our platform to launch a viral promotion campaign:\n\n👇 Click below to get started",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Launch Campaign", url: "https://promotemymemes.com/campaign-engine" }],
          ],
        },
      });
    } else if (text === "/trending") {
      await telegramCall("sendMessage", {
        chat_id: chatId,
        text: "📊 *Trending Tokens*\n\nCheck out the hottest tokens being promoted right now:\n\n👇 View live leaderboard",
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔥 View Trending", url: "https://promotemymemes.com/trending-memecoins" }],
          ],
        },
      });
    } else if (text === "/alpha") {
      // Fetch latest viral content
      const { data: latestAlpha } = await supabase
        .from("viral_content")
        .select("*")
        .eq("content_type", "alpha")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestAlpha) {
        await telegramCall("sendMessage", {
          chat_id: chatId,
          text: `🧠 *Latest Alpha*\n\n${latestAlpha.text}`,
          parse_mode: "Markdown",
        });
      } else {
        await telegramCall("sendMessage", {
          chat_id: chatId,
          text: "🧠 No alpha available right now. Check back soon!",
        });
      }
    } else if (text === "/stats") {
      const { data: userStats } = await supabase
        .from("telegram_bot_users")
        .select("referral_code")
        .eq("telegram_id", userId)
        .single();

      const refCode = userStats?.referral_code || referralCode;
      const { count: referralCount } = await supabase
        .from("telegram_bot_users")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", refCode);

      await telegramCall("sendMessage", {
        chat_id: chatId,
        text: `📊 *Your Stats*\n\n👤 Referral Code: \`${refCode}\`\n👥 Referrals: ${referralCount || 0}\n\n🔗 Share your link:\nhttps://t.me/promotememesai_bot?start=${refCode}`,
        parse_mode: "Markdown",
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
