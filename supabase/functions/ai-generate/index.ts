import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortenCA(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function fmt(val: number | string | null | undefined, prefix = "$"): string {
  if (val === null || val === undefined || val === "") return "N/A";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "N/A";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

function pct(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "N/A";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function truncName(name: string, max: number): string {
  return name.length > max ? name.slice(0, max - 1) + "…" : name;
}

function dexLink(addr: string): string {
  return `https://dexscreener.com/solana/${addr}`;
}
function solscanLink(addr: string): string {
  return `https://solscan.io/token/${addr}`;
}

// ── Platform formatters (template / fallback) ─────────────────────────────────

interface TokenData {
  symbol: string;
  address: string;
  name?: string;
  mcap?: number | string;
  launchedAgo?: string;
  launchDate?: string;
  buys1h?: number | string;
  sells1h?: number | string;
  buys6h?: number | string;
  sells6h?: number | string;
  buys24h?: number | string;
  sells24h?: number | string;
  vol5m?: number | string;
  vol5mPct?: number | string;
  vol1h?: number | string;
  vol1hPct?: number | string;
  vol24h?: number | string;
  vol24hPct?: number | string;
}

function telegramFormatter(hook: string, d: TokenData): string {
  const buyRatio1h = (d.buys1h && d.sells1h) ? (Number(d.buys1h) / Math.max(Number(d.sells1h), 1)).toFixed(1) : null;
  const lines = [
    `🚀 ${hook}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📊 ${d.name || d.symbol} ($${d.symbol})`,
    `💰 MCAP: ${fmt(d.mcap)}`,
    `⏱ Launched: ${d.launchedAgo || "N/A"}`,
    d.launchDate ? `📅 ${d.launchDate} UTC` : null,
    ``,
    `┌─── 📈 Buy / Sell ────────────┐`,
    `│ 1H:  🟢 ${d.buys1h ?? "–"}  │  🔴 ${d.sells1h ?? "–"}`,
    `│ 6H:  🟢 ${d.buys6h ?? "–"}  │  🔴 ${d.sells6h ?? "–"}`,
    `│ 24H: 🟢 ${d.buys24h ?? "–"} │  🔴 ${d.sells24h ?? "–"}`,
    buyRatio1h ? `│ ⚡ B/S Ratio (1H): ${buyRatio1h}x` : null,
    `└──────────────────────────────┘`,
    ``,
    `┌─── 💎 Volume ───────────────┐`,
    `│ 5M:  ${fmt(d.vol5m).padEnd(10)} ${pct(d.vol5mPct)}`,
    `│ 1H:  ${fmt(d.vol1h).padEnd(10)} ${pct(d.vol1hPct)}`,
    `│ 24H: ${fmt(d.vol24h).padEnd(10)} ${pct(d.vol24hPct)}`,
    `└──────────────────────────────┘`,
    ``,
    `📋 CA:`,
    d.address,
    ``,
    `🔗 CHART • HOLDERS • CHECK`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🤖 Promoted via PromoteMyMemes`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function twitterFormatter(hook: string, d: TokenData): string {
  const name = truncName(d.name || d.symbol, 14);
  const ca = shortenCA(d.address);
  const buyRatio = (d.buys1h && d.sells1h) ? `(${(Number(d.buys1h) / Math.max(Number(d.sells1h), 1)).toFixed(1)}x)` : "";

  const full = [
    `🚀 ${hook}`,
    ``,
    `📊 ${name} | MCAP ${fmt(d.mcap)}`,
    `📈 VOL1H: ${fmt(d.vol1h)} ${pct(d.vol1hPct)}`,
    `🟢 B/S 1H: ${d.buys1h ?? "–"}/${d.sells1h ?? "–"} ${buyRatio}`,
    ``,
    `📋 ${ca}`,
    ``,
    `#Solana #Memecoins #${d.symbol}`,
  ].join("\n");

  if (full.length <= 280) return full;

  const compact = [
    `🚀 ${hook}`,
    ``,
    `${name} | ${fmt(d.mcap)}`,
    `B/S: ${d.buys1h ?? "–"}/${d.sells1h ?? "–"} | VOL ${fmt(d.vol1h)}`,
    ``,
    `${ca}`,
    `#Solana #${d.symbol}`,
  ].join("\n");
  return compact.slice(0, 280);
}

function discordFormatter(hook: string, d: TokenData): string {
  const buyRatio1h = (d.buys1h && d.sells1h) ? (Number(d.buys1h) / Math.max(Number(d.sells1h), 1)).toFixed(1) : null;
  return [
    `# 🚀 ${hook}`,
    ``,
    `> **${d.name || d.symbol}** (\`$${d.symbol}\`)`,
    `> 💰 MCAP: **${fmt(d.mcap)}** • ⏱ Launched: **${d.launchedAgo || "N/A"}**`,
    ``,
    `### 📈 Market Activity`,
    `| Timeframe | 🟢 Buys | 🔴 Sells |`,
    `|-----------|---------|----------|`,
    `| 1H | ${d.buys1h ?? "–"} | ${d.sells1h ?? "–"} |`,
    `| 6H | ${d.buys6h ?? "–"} | ${d.sells6h ?? "–"} |`,
    `| 24H | ${d.buys24h ?? "–"} | ${d.sells24h ?? "–"} |`,
    buyRatio1h ? `\n⚡ **B/S Ratio (1H): ${buyRatio1h}x**` : null,
    ``,
    `### 💎 Volume`,
    `\`\`\``,
    `5M:  ${fmt(d.vol5m).padEnd(12)} ${pct(d.vol5mPct)}`,
    `1H:  ${fmt(d.vol1h).padEnd(12)} ${pct(d.vol1hPct)}`,
    `24H: ${fmt(d.vol24h).padEnd(12)} ${pct(d.vol24hPct)}`,
    `\`\`\``,
    ``,
    `📋 **CA:** \`${d.address}\``,
    ``,
    `🔗 [Chart](${dexLink(d.address)}) • [Holders](${solscanLink(d.address)}) • Check`,
    ``,
    `-# 🤖 Promoted via PromoteMyMemes`,
  ].filter((l) => l !== null).join("\n");
}

function instagramFormatter(hook: string, d: TokenData): string {
  return [
    `${hook} 🔥`,
    ``,
    `📊 $${d.symbol} is making waves!`,
    `💰 Market Cap: ${fmt(d.mcap)}`,
    `📈 Volume 1H: ${fmt(d.vol1h)} ${pct(d.vol1hPct)}`,
    d.buys1h ? `🟢 ${d.buys1h} buys in the last hour` : null,
    ``,
    `Don't sleep on this one 👀`,
    ``,
    `📋 CA in bio`,
    ``,
    `#memecoin #solana #crypto #${d.symbol.toLowerCase()} #defi #web3 #altcoins #cryptotrading #memecoins #solanamemecoins #pumpfun #degen #cryptogems`,
    ``,
    `🤖 @promotemymemes`,
  ].filter(l => l !== null).join("\n");
}

function redditFormatter(hook: string, d: TokenData): string {
  const buyRatio = (d.buys1h && d.sells1h) ? (Number(d.buys1h) / Math.max(Number(d.sells1h), 1)).toFixed(1) : null;
  return [
    `## ${hook}`,
    ``,
    `I've been tracking some interesting on-chain activity on **${d.name || d.symbol}** ($${d.symbol}) and wanted to share what I'm seeing.`,
    ``,
    `### Key Metrics`,
    `- **Market Cap:** ${fmt(d.mcap)}`,
    `- **1H Volume:** ${fmt(d.vol1h)} (${pct(d.vol1hPct)})`,
    `- **24H Volume:** ${fmt(d.vol24h)} (${pct(d.vol24hPct)})`,
    d.buys1h ? `- **1H Buy/Sell:** ${d.buys1h}/${d.sells1h}` : null,
    buyRatio ? `- **B/S Ratio:** ${buyRatio}x` : null,
    `- **Launched:** ${d.launchedAgo || "N/A"}`,
    ``,
    `### What I'm Seeing`,
    `The volume pattern looks organic and the buy pressure is building steadily. Not a recommendation — just sharing data I found interesting.`,
    ``,
    `**CA:** \`${d.address}\``,
    ``,
    `[DexScreener](${dexLink(d.address)}) | [Solscan](${solscanLink(d.address)})`,
    ``,
    `*As always, DYOR. This is not financial advice.*`,
  ].filter(l => l !== null).join("\n");
}


// ── AI prompt templates per platform ──────────────────────────────────────────

function buildAIPrompt(platform: string, d: TokenData, tone?: string, strategy?: string): { system: string; user: string } {
  const dataBlock = `Token: $${d.symbol}
Name: ${d.name || d.symbol}
CA: ${d.address}
MCAP: ${fmt(d.mcap)}
Launched: ${d.launchedAgo || "N/A"}
VOL1H: ${fmt(d.vol1h)} (${pct(d.vol1hPct)})
VOL24H: ${fmt(d.vol24h)} (${pct(d.vol24hPct)})
Buys/Sells 1H: ${d.buys1h ?? "N/A"}/${d.sells1h ?? "N/A"}
Buys/Sells 24H: ${d.buys24h ?? "N/A"}/${d.sells24h ?? "N/A"}`;

  const toneRules: Record<string, string> = {
    degenerate: "Use full degen CT energy. Slang like 'ape in', 'based', 'wagmi'. Keep it raw and authentic to crypto twitter culture.",
    professional: "Be clean, data-driven, and analytical. Sound like a research analyst. No slang.",
    meme: "Be funny and meme-heavy. Use humor, pop culture references, and meme formats. Make people laugh.",
    hype: "Create urgency and FOMO. Use phrases about scarcity, momentum, and limited time. High energy.",
  };

  const strategyRules: Record<string, string> = {
    viral_pump: "Focus on virality and hype. Make it shareable. Use FOMO elements.",
    organic_growth: "Focus on community building and trust. Natural, authentic tone.",
    influencer_boost: "Write as if you're a well-known crypto influencer sharing an alpha pick. Authority-driven.",
  };

  const toneInstruction = tone && toneRules[tone] ? `\nTONE: ${toneRules[tone]}` : "";
  const strategyInstruction = strategy && strategyRules[strategy] ? `\nSTRATEGY: ${strategyRules[strategy]}` : "";

  const system = `You are a professional crypto content creator who writes compelling, platform-native promotion messages.

RULES:
- Generate ONLY the hook line(s) — the rest of the message is auto-formatted.
- Be specific to the data provided. If volume is up, mention volume. If buy pressure is high, mention that.
- If data shows "N/A", don't reference that metric.
- NEVER use obviously spammy phrases like "100x gem", "guaranteed moon".${toneInstruction}${strategyInstruction}`;

  const platformRules: Record<string, string> = {
    telegram: `Generate a hook for Telegram. Max 2 lines. Will be placed at the top of a structured data block.`,
    twitter: `Generate a hook for Twitter/X. Max 1 line, max 60 characters. Must be punchy and concise.`,
    discord: `Generate a hook for Discord. Max 1-2 lines. Clean and informative tone.`,
    instagram: `Generate a caption hook for Instagram. Max 2 lines. Engaging, visual language. Will be followed by token data and hashtags.`,
    reddit: `Generate a title/hook for Reddit. Max 1 line. Natural, non-shill tone. Sounds like an organic community post, not marketing.`,
  };

  return {
    system,
    user: `${platformRules[platform] || platformRules.telegram}

TOKEN DATA:
${dataBlock}

Generate ONLY the hook text, nothing else.`,
  };
}

// ── Fallback hook templates ───────────────────────────────────────────────────

const HOOK_TEMPLATES: Record<string, string[]> = {
  telegram: [
    "Fresh alpha on ${symbol} — volume picking up with solid buy pressure.",
    "Noteworthy on-chain activity for ${symbol}. Clean chart structure forming.",
    "${symbol} showing early accumulation signals. Worth watching.",
  ],
  twitter: [
    "${symbol} building momentum on-chain 📊",
    "Clean volume on ${symbol} right now 👀",
    "Eyes on ${symbol} — buyers stepping in",
  ],
  discord: [
    "Interesting volume pattern on ${symbol} — buyers are active.",
    "${symbol} flagged for notable on-chain activity.",
    "Fresh entry window on ${symbol}. Data looks solid.",
  ],
  instagram: [
    "This one's been catching my eye 👀 ${symbol}",
    "${symbol} is starting to move — here's the data 📊",
    "On-chain signals are heating up for ${symbol} 🔥",
  ],
  reddit: [
    "Interesting on-chain data for ${symbol} — sharing what I found",
    "Noticed unusual volume on ${symbol}, here's the breakdown",
    "${symbol} metrics caught my attention — data inside",
  ],
};

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { symbol, address, platform, useAI, tokenName, tokenData, tone, strategy } = body;

    if (!symbol) {
      return new Response(JSON.stringify({ error: "symbol is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sym = symbol.toUpperCase();
    const addr = address || "XXXXXX...XXXXXX";
    const plat = platform || "telegram";

    // Build token data object from incoming data or defaults
    const d: TokenData = {
      symbol: sym,
      address: addr,
      name: tokenName || body.name || sym,
      mcap: tokenData?.mcap ?? body.mcap,
      launchedAgo: tokenData?.launchedAgo ?? body.launchedAgo,
      launchDate: tokenData?.launchDate ?? body.launchDate,
      buys1h: tokenData?.buys1h ?? body.buys1h,
      sells1h: tokenData?.sells1h ?? body.sells1h,
      buys6h: tokenData?.buys6h ?? body.buys6h,
      sells6h: tokenData?.sells6h ?? body.sells6h,
      buys24h: tokenData?.buys24h ?? body.buys24h,
      sells24h: tokenData?.sells24h ?? body.sells24h,
      vol5m: tokenData?.vol5m ?? body.vol5m,
      vol5mPct: tokenData?.vol5mPct ?? body.vol5mPct,
      vol1h: tokenData?.vol1h ?? body.vol1h,
      vol1hPct: tokenData?.vol1hPct ?? body.vol1hPct,
      vol24h: tokenData?.vol24h ?? body.vol24h,
      vol24hPct: tokenData?.vol24hPct ?? body.vol24hPct,
    };

    let hook: string | null = null;

    // Try AI hook generation
    if (useAI) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        try {
          const { system, user } = buildAIPrompt(plat, d, tone, strategy);
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
              max_tokens: 120,
              temperature: 0.7,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const aiText = aiData.choices?.[0]?.message?.content?.trim();
            if (aiText) hook = aiText.replace(/^["']|["']$/g, "");
          }
        } catch (_e) {
          // fallback to templates
        }
      }
    }

    // Fallback hook from templates
    if (!hook) {
      const bucket = HOOK_TEMPLATES[plat] || HOOK_TEMPLATES.telegram;
      hook = bucket[Math.floor(Math.random() * bucket.length)]
        .replace(/\${symbol}/g, `$${sym}`);
    }

    // Format per platform
    const formatter: Record<string, (h: string, d: TokenData) => string> = {
      telegram: telegramFormatter,
      twitter: twitterFormatter,
      discord: discordFormatter,
      instagram: instagramFormatter,
      reddit: redditFormatter,
    };
    const fn = formatter[plat] || telegramFormatter;
    const post = fn(hook, d);

    // Also generate all platform versions if requested
    const allPlatforms = body.allPlatforms === true;
    if (allPlatforms) {
      const results: Record<string, string> = {};
      for (const [key, formatFn] of Object.entries(formatter)) {
        results[`${key}_message`] = formatFn(hook, d);
      }
      return new Response(JSON.stringify({
        post,
        ...results,
        hook,
        source: useAI && hook ? "ai" : "template",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ post, hook, source: useAI && hook ? "ai" : "template" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
