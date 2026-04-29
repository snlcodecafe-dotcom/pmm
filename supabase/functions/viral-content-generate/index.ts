import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Content type distribution: 40% meme, 30% fomo, 30% alpha
function pickContentType(): "meme" | "fomo" | "alpha" {
  const r = Math.random();
  if (r < 0.4) return "meme";
  if (r < 0.7) return "fomo";
  return "alpha";
}

function buildPrompt(type: string, token: { name: string; symbol: string; address: string; mcap?: string; volume?: string; narrative?: string }) {
  const dataBlock = `Token: $${token.symbol} (${token.name})
CA: ${token.address}
Market Cap: ${token.mcap || "N/A"}
Volume: ${token.volume || "N/A"}
Narrative: ${token.narrative || "Solana memecoin"}`;

  const typePrompts: Record<string, string> = {
    fomo: `Generate a FOMO-driven crypto promotion post for Telegram. Create URGENCY and scarcity. Use phrases like "don't miss", "early", "pumping". Include rocket/fire emojis. Must feel like you'll miss out if you don't act NOW.`,
    alpha: `Generate an "insider alpha" style crypto post for Telegram. Write like a knowledgeable trader sharing a hidden gem. Use data points. Sound analytical but excited. Include chart/brain emojis. Must feel like exclusive intel.`,
    meme: `Generate a meme-style crypto post for Telegram. Be FUNNY, use internet humor, crypto slang (ape, degen, wagmi, based). Make it shareable and entertaining. Include relevant emojis. Must make people laugh AND want to check the token.`,
  };

  return {
    system: `You are a viral crypto content creator for Telegram channels. You write SHORT, PUNCHY posts that get engagement and clicks.

RULES:
- Max 800 characters total
- MUST include the CA (contract address) in copyable format
- MUST include a CTA to join @promotememesai
- Use Telegram-native formatting (bold with *, italic with _)
- Include relevant emojis
- NEVER say "not financial advice" or add disclaimers
- Make it feel authentic, not corporate
- End with a hook that drives engagement`,
    user: `${typePrompts[type]}

TOKEN DATA:
${dataBlock}

Generate ONLY the post text. Nothing else. Include the full CA address for easy copying.`,
  };
}

async function fetchTokenData(address: string): Promise<{ name?: string; symbol?: string; mcap?: string; volume?: string; narrative?: string; imageUrl?: string }> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (!res.ok) return {};
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair) return {};
    return {
      name: pair.baseToken?.name,
      symbol: pair.baseToken?.symbol,
      mcap: pair.marketCap ? `$${Number(pair.marketCap).toLocaleString()}` : undefined,
      volume: pair.volume?.h24 ? `$${Number(pair.volume.h24).toLocaleString()}` : undefined,
      narrative: pair.labels?.join(", ") || "Solana memecoin",
      imageUrl: pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${address}.png`,
    };
  } catch {
    return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { token_address, token_name, token_symbol, count = 3, content_types } = body;

    if (!token_address) {
      return new Response(JSON.stringify({ error: "token_address is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch token data from DexScreener
    const dexData = await fetchTokenData(token_address);

    const token = {
      name: token_name || dexData.name || "Unknown",
      symbol: token_symbol || dexData.symbol || "???",
      address: token_address,
      mcap: dexData.mcap,
      volume: dexData.volume,
      narrative: dexData.narrative,
    };

    // Check for existing content to avoid duplicates
    const { data: existing } = await supabase
      .from("viral_content")
      .select("text")
      .eq("token_address", token_address)
      .order("created_at", { ascending: false })
      .limit(10);

    const existingTexts = new Set((existing || []).map((e: any) => e.text?.substring(0, 50)));

    // Determine content types to generate
    const types: string[] = content_types || [];
    while (types.length < count) {
      types.push(pickContentType());
    }

    const results: any[] = [];

    for (const type of types.slice(0, count)) {
      const { system, user } = buildPrompt(type, token);

      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            max_tokens: 500,
            temperature: 0.9,
          }),
        });

        if (!aiRes.ok) {
          const errText = await aiRes.text();
          console.error(`AI error for ${type}:`, aiRes.status, errText);
          continue;
        }

        const aiData = await aiRes.json();
        const text = aiData.choices?.[0]?.message?.content?.trim();

        if (!text || existingTexts.has(text.substring(0, 50))) {
          console.log(`Skipping duplicate or empty content for ${type}`);
          continue;
        }

        // Store in DB
        const { data: inserted, error: insertErr } = await supabase
          .from("viral_content")
          .insert({
            token_name: token.name,
            token_address: token.address,
            token_symbol: token.symbol,
            content_type: type,
            text,
            image_url: dexData.imageUrl || null,
            mcap: token.mcap || null,
            volume: token.volume || null,
            narrative: token.narrative || null,
          })
          .select()
          .single();

        if (insertErr) {
          console.error("Insert error:", insertErr);
          continue;
        }

        results.push(inserted);
        existingTexts.add(text.substring(0, 50));
      } catch (e) {
        console.error(`Generation error for ${type}:`, e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      generated: results.length,
      content: results,
      token: { name: token.name, symbol: token.symbol, mcap: token.mcap, volume: token.volume },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
