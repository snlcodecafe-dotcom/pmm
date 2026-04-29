import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API = "https://api.telegram.org/bot";

async function telegramCall(method: string, body: any) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not configured");

  const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await res.json();
}

async function fetchTokenImage(address: string): Promise<string | null> {
  try {
    // Try DexScreener token logo
    const logoUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${address}.png`;
    const res = await fetch(logoUrl, { method: "HEAD" });
    if (res.ok) return logoUrl;
  } catch {}

  try {
    // Try DexScreener pair chart
    const apiRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      const pair = data.pairs?.[0];
      if (pair?.info?.imageUrl) return pair.info.imageUrl;
      // Chart screenshot
      if (pair?.pairAddress) {
        return `https://dexscreener.com/chart.png?pair=${pair.pairAddress}`;
      }
    }
  } catch {}

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode = "auto", content_id } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const channelId = Deno.env.get("TELEGRAM_CHANNEL_ID");
    if (!channelId) {
      return new Response(JSON.stringify({ error: "TELEGRAM_CHANNEL_ID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let contentToPost: any[] = [];

    if (mode === "specific" && content_id) {
      // Post specific content
      const { data } = await supabase
        .from("viral_content")
        .select("*")
        .eq("id", content_id)
        .single();
      if (data) contentToPost = [data];
    } else if (mode === "scheduled") {
      // Post scheduled content that's due
      const { data: schedules } = await supabase
        .from("content_schedule")
        .select("*, viral_content(*)")
        .eq("posted", false)
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      if (schedules) {
        contentToPost = schedules.map((s: any) => ({ ...s.viral_content, schedule_id: s.id }));
      }
    } else {
      // Auto mode: pick unposted content with rotation
      const { data } = await supabase
        .from("viral_content")
        .select("*")
        .eq("is_posted", false)
        .order("created_at", { ascending: true })
        .limit(1);

      if (data) contentToPost = data;
    }

    if (contentToPost.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No content to post" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const posted: any[] = [];

    for (const content of contentToPost) {
      try {
        // Try to get token image
        const imageUrl = content.image_url || await fetchTokenImage(content.token_address);

        let result;

        if (imageUrl) {
          // Post with image
          result = await telegramCall("sendPhoto", {
            chat_id: channelId,
            photo: imageUrl,
            caption: content.text,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🚀 Promote Your Token", url: "https://promotemymemes.com/campaign-engine" },
                  { text: "📊 View Chart", url: `https://dexscreener.com/solana/${content.token_address}` },
                ],
                [{ text: "🤖 Join Bot", url: "https://t.me/promotememesai_bot" }],
              ],
            },
          });
        } else {
          // Post text only
          result = await telegramCall("sendMessage", {
            chat_id: channelId,
            text: content.text,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🚀 Promote Your Token", url: "https://promotemymemes.com/campaign-engine" },
                  { text: "📊 View Chart", url: `https://dexscreener.com/solana/${content.token_address}` },
                ],
                [{ text: "🤖 Join Bot", url: "https://t.me/promotememesai_bot" }],
              ],
            },
          });
        }

        if (result.ok) {
          const messageId = result.result?.message_id;

          // Update viral_content
          await supabase
            .from("viral_content")
            .update({
              is_posted: true,
              posted_at: new Date().toISOString(),
              telegram_message_id: messageId,
            })
            .eq("id", content.id);

          // Update schedule if applicable
          if (content.schedule_id) {
            await supabase
              .from("content_schedule")
              .update({
                posted: true,
                posted_at: new Date().toISOString(),
                telegram_message_id: messageId,
              })
              .eq("id", content.schedule_id);
          }

          // Create engagement action (poll after post)
          await supabase.from("engagement_actions").insert({
            content_id: content.id,
            action_type: "poll",
            payload: {
              question: `What do you think about $${content.token_symbol || "this token"}?`,
              options: ["🚀 Bullish", "💀 Scam", "🤔 Need more info", "🦍 Already aping"],
            },
          });

          posted.push({ id: content.id, message_id: messageId, type: content.content_type });
        } else {
          console.error("Telegram post failed:", result);
          if (content.schedule_id) {
            await supabase
              .from("content_schedule")
              .update({ error_message: JSON.stringify(result) })
              .eq("id", content.schedule_id);
          }
        }

        // Rate limit: wait between posts
        if (contentToPost.length > 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (e) {
        console.error("Post error:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, posted: posted.length, details: posted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Auto-post error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
