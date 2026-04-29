import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap, Twitter, Send, MessageSquare, TrendingUp, Users, Eye,
  BarChart3, Activity, CheckCircle2, Clock, ChevronDown, Copy,
  Wallet, AlertCircle, Loader2, Shield, RefreshCw, ExternalLink, ChevronRight,
  BookOpen, Menu, X as XIcon, Star, Target, Rocket, Lock, Search, Crown, DollarSign, ArrowRight
} from "lucide-react";
import SEOHead, { productSchema, faqSchema } from "@/components/SEOHead";
import heroBg from "@/assets/hero-bg.jpg";
import logoIcon from "@/assets/logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { useStatsMode } from "@/hooks/useStatsMode";
import { FAKE_STATS } from "@/lib/planConfig";
import { usePackages, type PackageConfig } from "@/hooks/usePackages";
import { STRATEGIES, TONES, type StrategyKey, type ToneKey, calculateDynamicPrice } from "@/lib/planConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type TokenRow = {
  id: string; token_address: string; token_symbol: string | null; token_name: string | null;
  promotion_type: string; price_sol: number; status: string;
  created_at: string; views: number | null; engagement_score: number | null;
};

type SocialPostRow = {
  id: string; token_submission_id: string | null; platform: string; post_text: string;
  likes: number | null; shares: number | null; views: number | null; reactions: number | null; created_at: string;
};

type BotRow = {
  id: string; token_symbol: string; platform: string; action_type: string;
  action_detail: string; status: string; created_at: string;
};

// ─── Static fallback data ─────────────────────────────────────────────────────

const FEATURED_TOKENS_FALLBACK = [
  { name: "BONK", symbol: "$BONK", mc: "$4.2M", change: "+312%", img: "🐕", color: "hsl(186 100% 50%)", hot: true },
  { name: "PepeCoin", symbol: "$PEPE", mc: "$891K", change: "+187%", img: "🐸", color: "hsl(120 60% 50%)", hot: true },
  { name: "DogeKing", symbol: "$DKNG", mc: "$2.1M", change: "+94%", img: "👑", color: "hsl(45 100% 50%)", hot: false },
  { name: "MoonShib", symbol: "$MSHIB", mc: "$312K", change: "+441%", img: "🌙", color: "hsl(270 80% 60%)", hot: true },
];

// PACKAGES are now loaded dynamically via usePackages hook
const DISCLAIMER = "We do not guarantee any returns or promise any specific results from using our free plan. The promotion of coins on PromoteMyMemes or any other platform is not guaranteed. Users should exercise caution and conduct their own research before making any investment decisions. Cryptocurrency trading involves substantial risk and may not be suitable for all investors.";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 2000, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return count;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function StatCounter({ value, label, suffix = "+", display: customDisplay }: { value: number; label: string; suffix?: string; display?: string }) {
  const { ref, inView } = useInView(0.3);
  const count = useCountUp(value, 1800, inView);
  const display = customDisplay ?? (value >= 1000 ? `${(count / 1000).toFixed(1)}K${suffix}` : `${count}${suffix}`);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-bold tabular-nums" style={{ color: "hsl(var(--cyan))" }}>{display}</div>
      <div className="text-sm text-muted-foreground uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function SectionReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView(0.1);
  return (
    <div ref={ref} className={`${inView ? "animate-fade-up" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

// ── Live Social Proof Toast ───────────────────────────────────────────────────

const SOCIAL_PROOF_MESSAGES = [
  "Someone just promoted $BONK token 🚀",
  "🔥 1,200 users reached in last campaign",
  "New token just listed: $PEPE 📊",
  "$MOON campaign completed — 8.4K reach ✅",
  "Trending: $CHAD up 223% after promotion",
  "🎯 Ultra campaign launched for $ROCKET",
  "New user promoted across 5 platforms 🌐",
];

function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const show = () => {
      setMessage(SOCIAL_PROOF_MESSAGES[Math.floor(Math.random() * SOCIAL_PROOF_MESSAGES.length)]);
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };
    const initialDelay = setTimeout(show, 5000);
    const interval = setInterval(show, 12000 + Math.random() * 8000);
    return () => { clearTimeout(initialDelay); clearInterval(interval); };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-fade-up max-w-xs">
      <div className="rounded-xl px-4 py-3 border flex items-center gap-3 text-sm font-medium shadow-lg"
        style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--purple) / 0.3)", boxShadow: "0 0 30px hsl(var(--purple) / 0.15)" }}>
        <span className="text-lg">⚡</span>
        <span className="text-foreground/90">{message}</span>
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const map: Record<string, { icon: string; label: string; color: string }> = {
    twitter: { icon: "𝕏", label: "Twitter/X", color: "hsl(210 100% 56%)" },
    telegram: { icon: "✈️", label: "Telegram", color: "hsl(200 90% 55%)" },
    discord: { icon: "💬", label: "Discord", color: "hsl(235 85% 65%)" },
    instagram: { icon: "📸", label: "Instagram", color: "hsl(330 80% 55%)" },
    reddit: { icon: "🔴", label: "Reddit", color: "hsl(16 100% 50%)" },
  };
  const p = map[platform] || { icon: "📢", label: platform, color: "hsl(var(--cyan))" };
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: p.color }}>
      <span>{p.icon}</span> {p.label}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Index() {
  const { wallet, connect, disconnect, sendSol } = useSolanaWallet();
  const { mode: statsMode } = useStatsMode();
  const { packages: PACKAGES } = usePackages();

  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [selectedPkg, setSelectedPkg] = useState("pro");
  const [activeTab, setActiveTab] = useState<"feed" | "social" | "bots">("feed");
  const [copied, setCopied] = useState<string | null>(null);

  const [submitStep, setSubmitStep] = useState<"idle" | "paying" | "confirming" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");

  const [liveTokens, setLiveTokens] = useState<TokenRow[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPostRow[]>([]);
  const [botLogs, setBotLogs] = useState<BotRow[]>([]);
  const [adminWallet, setAdminWallet] = useState<string>("");
  const [stats, setStats] = useState({ tokens: 0, views: 0 });
  const [loading, setLoading] = useState(false);

  const loadFeedData = useCallback(async () => {
    setLoading(true);
    const [tokensRes, postsRes, botsRes, adminRes] = await Promise.all([
      supabase.from("token_submissions").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("bot_activity_log").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("admin_settings").select("value").eq("key", "admin_wallet").single(),
    ]);
    if (tokensRes.data) {
      setLiveTokens(tokensRes.data as TokenRow[]);
      setStats({
        tokens: tokensRes.data.length,
        views: tokensRes.data.reduce((s, t) => s + (t.views || 0), 0),
      });
    }
    if (postsRes.data) setSocialPosts(postsRes.data as SocialPostRow[]);
    if (botsRes.data) setBotLogs(botsRes.data as BotRow[]);
    if (adminRes.data) setAdminWallet(adminRes.data.value);
    setLoading(false);
  }, []);

  useEffect(() => { loadFeedData(); }, [loadFeedData]);

  const pkg = PACKAGES.find(p => p.key === selectedPkg) || PACKAGES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddress.trim()) return;

    if (pkg.priceSol > 0 && !wallet.connected) {
      await connect();
      return;
    }

    setSubmitError("");
    setSubmitStep(pkg.priceSol > 0 ? "paying" : "confirming");

    let txSig: string | null = null;

    if (pkg.priceSol > 0) {
      if (!adminWallet || adminWallet === "NOT_SET") {
        setSubmitError("Payment destination not configured. Please use the free plan or contact support.");
        setSubmitStep("error");
        return;
      }
      try {
        txSig = await sendSol(adminWallet, pkg.priceSol);
      } catch (err) {
        setSubmitError(`Payment failed: ${err instanceof Error ? err.message : String(err)}`);
        setSubmitStep("error");
        return;
      }
    }

    setSubmitStep("confirming");

    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/submit-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": ANON_KEY,
          },
          body: JSON.stringify({
            tokenAddress: tokenAddress.trim(),
            tokenSymbol: tokenSymbol.trim() || undefined,
            promotionType: pkg.dbPromotionType || "basic",
            walletAddress: wallet.publicKey,
            txSignature: txSig,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitStep("success");
      setTimeout(() => {
        setSubmitStep("idle");
        setTokenAddress("");
        setTokenSymbol("");
        loadFeedData();
      }, 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
      setSubmitStep("error");
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 1500);
  };

  const handlePkgSelect = (pkgKey: string) => {
    setSelectedPkg(pkgKey);
    setSubmitStep("idle");
    setSubmitError("");
  };

  // Sort active tokens: premium first, then advanced, then basic. Within tier, by views desc.
  const activeTokens = liveTokens
    .filter(t => t.status === "active")
    .sort((a, b) => {
      const tierOrder: Record<string, number> = { premium: 0, advanced: 1, basic: 2 };
      const tierDiff = (tierOrder[a.promotion_type] ?? 3) - (tierOrder[b.promotion_type] ?? 3);
      if (tierDiff !== 0) return tierDiff;
      return (b.views || 0) - (a.views || 0);
    });

  const displayTokensFeatured = activeTokens.slice(0, 4).map(t => ({
    name: t.token_name || t.token_symbol || "?",
    symbol: `$${t.token_symbol || "?"}`,
    mc: t.promotion_type === "premium" ? "🔥 TOP" : t.promotion_type === "advanced" ? "⭐ Featured" : "Listed",
    change: "+NEW",
    img: t.promotion_type === "premium" ? "👑" : t.promotion_type === "advanced" ? "⭐" : "🚀",
    color: "hsl(var(--cyan))",
    hot: t.promotion_type === "premium" || t.promotion_type === "advanced",
    isReal: true,
  }));
  const displayTokens = [
    ...displayTokensFeatured,
    ...FEATURED_TOKENS_FALLBACK.slice(0, Math.max(4, 8 - displayTokensFeatured.length)),
  ];

  const HOW_IT_WORKS = [
    { n: "01", icon: "🪙", title: "Submit Your Token", desc: "Paste your Solana contract address, add your symbol, and select your promotion package — takes under 60 seconds." },
    { n: "02", icon: "🤖", title: "AI Generates Content", desc: "Our AI instantly creates optimized posts for Twitter/X, Telegram, and Discord — tailored to each platform's audience." },
    { n: "03", icon: "🚀", title: "Watch It Go Live", desc: "Your token gets distributed across our opt-in community network. Track real engagement on your live campaign dashboard." },
  ];

  const TESTIMONIALS = [
    { text: "The AI-generated content is top quality. Way better than anything I could write manually for each platform.", handle: "@solana_degen88", stars: 5 },
    { text: "Used PromoteMyMemes for my Pump.fun launch. The multi-platform reach was incredible. Best 0.1 SOL I ever spent.", handle: "@pumpfun_dev", stars: 5 },
    { text: "The real-time dashboard showing actual engagement metrics gave me confidence. Transparent and effective.", handle: "@memeking_sol", stars: 5 },
    { text: "Finally a promotion platform that focuses on real community reach instead of fake metrics. Solid results.", handle: "@cryptoalpha2026", stars: 5 },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "hsl(var(--background))" }}>
      <SEOHead
        title="PromoteMyMemes — Launch, Audit & Promote Solana Memecoins"
        description="The complete Solana memecoin stack: launch tokens in one signature, audit DEX readiness, attach on-chain Metaplex metadata, lock LP, and promote across Telegram, X, Discord, Instagram & Reddit."
        canonical="/"
        keywords="solana token launcher, memecoin promotion, pump.fun alternative, metaplex metadata attach, dex readiness score, audit solana token, raydium liquidity pool, telegram crypto promotion, lp locker"
        schema={[
          productSchema({
            name: "PromoteMyMemes — Solana Token Launch & Promotion Suite",
            description: "Launch SPL tokens in one signature, attach on-chain Metaplex metadata, create & lock liquidity, audit DEX readiness, and promote across Telegram, X, Discord, Instagram and Reddit.",
            url: "https://promotemymemes.com",
          }),
          faqSchema([
            { question: "How do I launch a Solana token without code?", answer: "Use PromoteMyMemes Launch Token: a single guided flow creates the SPL mint, attaches on-chain Metaplex metadata, opens a Raydium/Meteora/Orca pool, and optionally locks the LP — all from your Phantom or Backpack wallet." },
            { question: "Can I audit an existing Solana token?", answer: "Yes. Paste any Solana mint address into Audit Token to get a 0–100 DEX Readiness score with on-chain metadata checks, indexing status across Jupiter, DexScreener and Raydium, and one-click Fix-Now actions for missing metadata, liquidity or indexer submission." },
            { question: "How is this better than Pump.fun?", answer: "You keep mint authority, choose your own DEX (Raydium, Meteora, Orca), avoid the forced bonding curve and platform tax, and get a guided readiness checklist before going live." },
            { question: "How do I promote my memecoin?", answer: "Submit your token, choose a package, and our AI generates and distributes optimized posts across Telegram, X, Discord, Instagram and Reddit through our opt-in community network — with real-time engagement tracking." },
            { question: "How much does it cost?", answer: "Token launch starts from 0.15 SOL. Promotion has a free tier; paid growth campaigns start at 0.1 SOL. No subscriptions, no hidden platform tax." },
          ]),
        ]}
      />


      {/* ── Ticker Banner ── fixed directly under the MainNav so it never overlaps text and stays attached on every breakpoint */}
      <div
        className="fixed left-0 right-0 z-40 overflow-hidden h-8 top-[97px] lg:top-14"
        style={{
          background: "hsl(var(--surface-2))",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        <div className="flex animate-ticker whitespace-nowrap h-full items-center">
          {[...displayTokens, ...displayTokens].map((t, i) => (
            <span key={i} className="px-6 text-xs font-mono flex items-center gap-2 flex-shrink-0">
              <span>{t.img}</span>
              <span className="font-bold" style={{ color: "hsl(var(--cyan))" }}>{t.symbol}</span>
              <span className="font-bold" style={{ color: "hsl(120 70% 55%)" }}>{t.change}</span>
              {"mc" in t && <span className="text-muted-foreground">MC: {(t as typeof FEATURED_TOKENS_FALLBACK[0]).mc}</span>}
              <span className="text-muted-foreground mx-2">·</span>
            </span>
          ))}
        </div>
      </div>
      {/* Spacer compensates for the fixed ticker (h-8 = 32px) so hero content isn't hidden under it */}
      <div aria-hidden className="h-8" />

      {/* ── Hero ── */}
      <section
        className="relative flex flex-col items-center justify-center pt-4 sm:pt-6 pb-16 px-4"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0" style={{ background: "hsl(var(--background) / 0.82)" }} />
        <div className="relative z-10 text-center max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in flex-wrap">
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ background: "hsl(var(--purple) / 0.15)", color: "hsl(var(--purple))", borderColor: "hsl(var(--purple) / 0.35)" }}>✦ AI-Powered</span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ background: "hsl(var(--cyan) / 0.12)", color: "hsl(var(--cyan))", borderColor: "hsl(var(--cyan) / 0.3)" }}>⚡ Live in 60s</span>
            <span className="px-3 py-1 text-xs font-semibold rounded-full border" style={{ background: "hsl(120 70% 50% / 0.12)", color: "hsl(120 70% 55%)", borderColor: "hsl(120 70% 50% / 0.3)" }}>● {stats.tokens > 0 ? `${stats.tokens}+ tokens promoted` : "Trusted by token devs"}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 animate-fade-up" style={{ lineHeight: "1.05" }}>
            Get Real <span style={{ color: "hsl(var(--purple))" }}>Buyers</span> for<br />Your <span style={{ color: "hsl(var(--cyan))" }}>Memecoin</span> — Today
          </h1>
          <p className="text-lg text-muted-foreground mb-3 animate-fade-up delay-100">
            AI-powered promotion across <strong className="text-foreground">Telegram, X, Discord, Instagram &amp; Reddit</strong>. Live in 60 seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-6 animate-fade-up delay-150 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--cyan))" }} /> No signup to start</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--cyan))" }} /> Pay-per-campaign in SOL</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "hsl(var(--cyan))" }} /> Transparent on-chain delivery</span>
          </div>

          {/* Secondary CTA: Launch a Token (de-emphasized) */}
          <div className="flex justify-center mb-6 animate-fade-up delay-200">
            <Link
              to="/launch-token"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Don't have a token yet? <span style={{ color: "hsl(var(--cyan))" }}>Launch one in one signature →</span>
            </Link>
          </div>

          {/* Token Submit Form */}
          <div className="animate-fade-up delay-300 max-w-lg mx-auto">
            <form onSubmit={handleSubmit} className="card-glass rounded-2xl p-6 text-left shadow-2xl" style={{ boxShadow: "0 0 80px hsl(var(--purple) / 0.18)" }}>

              {/* Package selector */}
              <div className="flex gap-1 p-1 rounded-xl mb-5" style={{ background: "hsl(var(--surface-3))" }}>
                {PACKAGES.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePkgSelect(p.key)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                    style={selectedPkg === p.key ? {
                      background: `linear-gradient(135deg, hsl(${p.color}), hsl(var(--cyan) / 0.6))`,
                      color: "white",
                      boxShadow: "0 2px 12px hsl(var(--purple) / 0.3)",
                    } : { color: "hsl(var(--muted-foreground))" }}
                  >
                    {p.name} {p.popular && "⭐"}
                  </button>
                ))}
              </div>

              <div className="mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Token Contract Address *</label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={e => setTokenAddress(e.target.value)}
                  placeholder="Paste your Solana token address…"
                  className="w-full rounded-lg px-4 py-3 text-sm font-mono focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                  style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  disabled={submitStep !== "idle" && submitStep !== "error"}
                />
              </div>
              <div className="mb-4">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Token Symbol (optional)</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={e => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. BONK"
                  maxLength={12}
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                  style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                  disabled={submitStep !== "idle" && submitStep !== "error"}
                />
              </div>

              {/* Package summary */}
              <div className="mb-5 p-3 rounded-xl text-xs" style={{ background: "hsl(var(--surface-3))", border: `1px solid hsl(${pkg.color} / 0.25)` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold" style={{ color: `hsl(${pkg.color})` }}>{pkg.name} Package — {pkg.price}</span>
                  <span className="text-muted-foreground">{pkg.duration}</span>
                </div>
                <div className="text-muted-foreground">{pkg.deliverables}</div>
              </div>

              {/* Paid package: wallet requirement */}
              {pkg.priceSol > 0 && !wallet.connected && submitStep === "idle" && (
                <div className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2" style={{ background: "hsl(var(--purple) / 0.1)", border: "1px solid hsl(var(--purple) / 0.25)", color: "hsl(var(--purple))" }}>
                  <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
                  Connect your Phantom wallet to pay {pkg.price} SOL
                </div>
              )}

              {/* Error */}
              {submitStep === "error" && (
                <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm" style={{ background: "hsl(0 85% 60% / 0.1)", border: "1px solid hsl(0 85% 60% / 0.3)", color: "hsl(0 85% 65%)" }}>
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit button / states */}
              {submitStep === "success" ? (
                <div className="flex flex-col items-center gap-2 py-5 rounded-xl text-center" style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>
                  <CheckCircle2 className="w-7 h-7" />
                  <span className="font-bold">Promotion Active!</span>
                  <span className="text-xs opacity-70">Check the dashboard below — your token is live ✓</span>
                </div>
              ) : submitStep === "paying" ? (
                <div className="flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--purple) / 0.12)", color: "hsl(var(--purple))" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for wallet approval…
                </div>
              ) : submitStep === "confirming" ? (
                <div className="flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))" }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting promotion services…
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--purple)), hsl(270 60% 45%))",
                    color: "white",
                    boxShadow: "0 0 28px hsl(var(--purple) / 0.45)",
                  }}
                >
                  {pkg.priceSol > 0 && !wallet.connected ? (
                    <><Wallet className="w-4 h-4" /> Connect Wallet & Pay {pkg.price}</>
                  ) : pkg.priceSol > 0 ? (
                    <><Zap className="w-4 h-4" /> Pay {pkg.price} & Launch Promotion</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Start Free Promotion</>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Stats Row */}
        <div className="relative z-10 mt-12 w-full max-w-2xl mx-auto animate-fade-up delay-500">
          <div className="grid grid-cols-3 gap-8">
            <StatCounter value={statsMode === "fake" ? FAKE_STATS.totalTokens : stats.tokens} label="Coins Promoted" />
            <StatCounter value={statsMode === "fake" ? FAKE_STATS.totalViews : stats.views} label="Views Generated" />
            <StatCounter value={24} label="Always On" display="24/7" suffix="" />
          </div>
        </div>
      </section>

      {/* ── Why We're Different (Comparison) ── */}
      <SectionReveal>
        <section className="py-20 px-4 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          <div className="container max-w-6xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary mb-4">
                <Crown className="h-3.5 w-3.5" /> Why PromoteMyMemes
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                The <span className="gradient-text-purple">complete launch + growth</span> stack
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
                One platform that replaces three: better than Pump.fun for control, easier than raw Metaplex for setup, and competitive with full launch suites for growth.
              </p>
            </div>

            {/* 3 differentiator cards */}
            <div className="grid md:grid-cols-3 gap-5 mb-12">
              {[
                {
                  icon: Rocket,
                  badge: "Better than Pump.fun",
                  title: "You own your token",
                  points: [
                    "Mint authority stays in your wallet",
                    "Choose Raydium, Meteora or Orca pools",
                    "No forced bonding curve, no platform tax",
                  ],
                  color: "from-fuchsia-500/20 to-purple-500/10 border-fuchsia-500/30",
                },
                {
                  icon: Shield,
                  badge: "More usable than Metaplex",
                  title: "Guided, mistake-proof setup",
                  points: [
                    "Stepper enforces metadata before liquidity",
                    "On-chain Metaplex attach with one click",
                    "Authority revoke gated behind safety modal",
                  ],
                  color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30",
                },
                {
                  icon: Target,
                  badge: "Competes with launch platforms",
                  title: "Built-in DEX readiness + growth",
                  points: [
                    "Live indexing checks: Jupiter, DexScreener, Raydium",
                    "0–100 DEX Readiness score with Fix-Now actions",
                    "Telegram, X, Discord & Reddit promotion engine",
                  ],
                  color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
                },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.badge}
                    className={`rounded-2xl p-6 bg-gradient-to-br ${c.color} border backdrop-blur-sm hover:scale-[1.02] transition-transform`}
                  >
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/70 mb-3">
                      👉 {c.badge}
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 rounded-xl bg-background/40 border border-border">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg">{c.title}</h3>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {c.points.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground/85">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Comparison table */}
            <div className="rounded-2xl border border-border bg-surface-1/60 backdrop-blur-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2/50">
                    <tr>
                      <th className="text-left p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Capability</th>
                      <th className="p-4 font-semibold text-xs uppercase tracking-wider">
                        <span className="gradient-text-purple">PromoteMyMemes</span>
                      </th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Pump.fun</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Raw Metaplex</th>
                      <th className="p-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Launch suites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["You keep mint authority", true, false, true, "varies"],
                      ["Guided metadata + on-chain attach", true, "auto only", false, true],
                      ["Choose your DEX (Raydium/Meteora/Orca)", true, false, true, "limited"],
                      ["DEX readiness score & live indexing checks", true, false, false, "rare"],
                      ["Built-in promotion (TG, X, Discord, Reddit)", true, false, false, "extra cost"],
                      ["Authority revoke safety gate", true, "n/a", false, "varies"],
                      ["No forced bonding curve / platform tax", true, false, true, "varies"],
                    ].map(([cap, us, pump, mpl, suites]) => (
                      <tr key={cap as string} className="border-t border-border/60">
                        <td className="p-4 text-foreground/90">{cap}</td>
                        <td className="p-4 text-center">
                          {us === true ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" /> : <span className="text-muted-foreground text-xs">{String(us)}</span>}
                        </td>
                        <td className="p-4 text-center">
                          {pump === true ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" /> : pump === false ? <XIcon className="h-5 w-5 text-red-400/70 mx-auto" /> : <span className="text-muted-foreground text-xs">{String(pump)}</span>}
                        </td>
                        <td className="p-4 text-center">
                          {mpl === true ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" /> : mpl === false ? <XIcon className="h-5 w-5 text-red-400/70 mx-auto" /> : <span className="text-muted-foreground text-xs">{String(mpl)}</span>}
                        </td>
                        <td className="p-4 text-center">
                          {suites === true ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" /> : suites === false ? <XIcon className="h-5 w-5 text-red-400/70 mx-auto" /> : <span className="text-muted-foreground text-xs">{String(suites)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-10">
              <Link to="/launch-token" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary/70 text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:scale-105 transition-transform">
                <Rocket className="h-4 w-4" /> Launch your token
              </Link>
              <Link to="/audit-token" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border bg-surface-2/60 hover:bg-surface-2 font-semibold transition-colors">
                <Shield className="h-4 w-4" /> Audit existing token
              </Link>
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ── Feature Badges ── */}
      <SectionReveal>
        <section className="py-12 border-y" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border) / 0.5)" }}>
          <div className="container">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Zap className="w-5 h-5" />, title: "AI-Powered", desc: "Smart narrative generation" },
                { icon: <Twitter className="w-5 h-5" />, title: "5 Platforms", desc: "X, TG, Discord, IG, Reddit" },
                { icon: <TrendingUp className="w-5 h-5" />, title: "Community Reach", desc: "Opt-in distribution" },
                { icon: <Activity className="w-5 h-5" />, title: "Real-Time", desc: "Live engagement tracking" },
              ].map((f, i) => (
                <div key={i} className="card-glass rounded-xl p-5 flex flex-col items-center text-center gap-2 hover:-translate-y-0.5 transition-all border border-border hover:border-purple" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-1" style={{ background: "linear-gradient(135deg, hsl(var(--purple) / 0.2), hsl(var(--cyan) / 0.15))", color: "hsl(var(--cyan))" }}>
                    {f.icon}
                  </div>
                  <div className="font-bold text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </SectionReveal>

      {/* ── Token Launch Engine (Highlighted) ── */}
      <section className="py-20 px-4 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at top, hsl(var(--cyan) / 0.15), transparent 60%)" }} />
        <div className="container max-w-6xl relative z-10">
          <SectionReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5 border" style={{ background: "hsl(var(--cyan) / 0.12)", color: "hsl(var(--cyan))", borderColor: "hsl(var(--cyan) / 0.35)" }}>
                <Rocket className="w-3.5 h-3.5" /> NEW · TOKEN LAUNCH ENGINE
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ lineHeight: 1.1 }}>
                Launch Your Token in <span style={{ color: "hsl(var(--cyan))" }}>One Signature</span>
              </h2>
              <p className="text-base text-muted-foreground max-w-2xl mx-auto">
                <strong className="text-foreground">Create → Add Liquidity → Lock LP → Index → Promote.</strong> One flow. No code, no Raydium tabs, no separate locker. Live on Solana mainnet in under 3 minutes.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
              {[
                { icon: Rocket, label: "Create", desc: "SPL mint + metadata", color: "hsl(var(--cyan))" },
                { icon: Zap, label: "Liquidity", desc: "Auto-paired pool", color: "hsl(var(--purple))" },
                { icon: Lock, label: "Lock LP", desc: "Trust signal locked", color: "hsl(45 100% 55%)" },
                { icon: Search, label: "Index", desc: "DexScreener + Jupiter", color: "hsl(120 70% 55%)" },
                { icon: TrendingUp, label: "Promote", desc: "Auto-campaign starts", color: "hsl(330 80% 60%)" },
              ].map((s, i) => (
                <div key={i} className="card-glass rounded-2xl p-4 text-center border border-border hover:border-cyan transition-all hover:-translate-y-1 relative">
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: s.color }}>{i + 1}</div>
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: `${s.color.replace(")", " / 0.15)")}`, color: s.color }}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div className="font-black text-sm mb-0.5">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                </div>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: "⚡", title: "60-second deploy", desc: "Mint, metadata, and pool created in a single signed transaction. No rolling your own scripts." },
                { icon: "🔒", title: "LP locked by default", desc: "Built-in liquidity locker (Streamflow / Meteora) — instant rug-proof trust signal for buyers." },
                { icon: "📡", title: "Auto-indexed + promoted", desc: "DexScreener & Jupiter pickup verified, then promotion kicks off across TG, X, Discord automatically." },
              ].map((b, i) => (
                <div key={i} className="card-glass rounded-2xl p-5 border border-border">
                  <div className="text-3xl mb-2">{b.icon}</div>
                  <div className="font-black text-sm mb-1">{b.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{b.desc}</div>
                </div>
              ))}
            </div>
          </SectionReveal>

          <SectionReveal>
            <div className="text-center">
              <Link to="/launch-token"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-base text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))", boxShadow: "0 0 50px hsl(var(--cyan) / 0.4)" }}>
                <Rocket className="w-5 h-5" /> Launch Your Token Now <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="text-xs text-muted-foreground mt-3">From 0.15 SOL · Mainnet · Phantom / Backpack supported</div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── Complete Token Stack ── */}
      <section className="py-20 px-4" style={{ background: "hsl(var(--background))" }}>
        <div className="container max-w-5xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5 border" style={{ background: "hsl(var(--purple) / 0.12)", color: "hsl(var(--purple))", borderColor: "hsl(var(--purple) / 0.3)" }}>
                <Activity className="w-3.5 h-3.5" /> The Complete Stack
              </div>
              <h2 className="text-4xl sm:text-5xl font-black mb-4">
                EVERY TOOL FOR YOUR <span style={{ color: "hsl(var(--purple))" }}>SOLANA TOKEN</span>
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8">
                Launch, fix, fund, index and promote — one platform, no scattered tabs, no separate scripts.
              </p>
              <Link to="/launch-token"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", boxShadow: "0 0 50px hsl(var(--purple) / 0.4)" }}>
                <Rocket className="w-5 h-5" /> Start with Launch Token
              </Link>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { to: "/launch-token", icon: "🚀", title: "Launch Token", desc: "Create an SPL token with on-chain Metaplex metadata in a single signed transaction.", tag: "Core" },
              { to: "/audit-token", icon: "🛡️", title: "Audit Token", desc: "0–100 DEX Readiness score, indexing checks (Jupiter, DexScreener, Raydium) and Fix-Now actions.", tag: "Core" },
              { to: "/token-tools/metadata", icon: "🖼️", title: "Metadata Tool", desc: "Pin JSON to IPFS and attach Metaplex metadata on-chain so DEXs and wallets show your name, symbol & logo.", tag: "Tool" },
              { to: "/token-tools/liquidity", icon: "💧", title: "Liquidity Pool", desc: "Open a Raydium/Meteora/Orca pool with auto-pairing — no DEX tab juggling.", tag: "Tool" },
              { to: "/token-tools/indexers", icon: "📡", title: "Submit to Indexers", desc: "One-click submission to DexScreener, Jupiter and listing aggregators for instant discoverability.", tag: "Tool" },
              { to: "/ai-promo", icon: "🧠", title: "AI Promotion Studio", desc: "Generate viral X threads, Telegram announcements & Discord posts tailored to each platform.", tag: "Growth" },
              { to: "/campaign-engine", icon: "🎯", title: "Campaign Engine", desc: "Plan, queue and execute multi-platform promo campaigns with real-time execution logs.", tag: "Growth" },
              { to: "/viral-loop", icon: "🔄", title: "Viral Loop & Referrals", desc: "Shareable token cards, one-click X/Telegram share, and a referral program that compounds reach.", tag: "Growth" },
              { to: "/partner/apply", icon: "👑", title: "Partner Earnings", desc: "Telegram channel owners earn up to 10% on every promotion — paid in SOL on-chain.", tag: "Earn" },
            ].map((m, i) => (
              <SectionReveal key={i}>
                <Link to={m.to}
                  className="card-glass rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300 border border-border hover:border-purple group block h-full"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{m.icon}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: m.tag === "Earn" ? "hsl(45 100% 55% / 0.15)" : m.tag === "Growth" ? "hsl(var(--purple) / 0.15)" : "hsl(var(--cyan) / 0.12)", color: m.tag === "Earn" ? "hsl(45 100% 55%)" : m.tag === "Growth" ? "hsl(var(--purple))" : "hsl(var(--cyan))" }}>
                      {m.tag}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-sm mb-1">{m.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{m.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: "hsl(var(--purple))" }}>
                    Open <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-16 px-4" style={{ background: "hsl(var(--surface-1))" }}>
        <div className="container max-w-4xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">PROMOTION <span style={{ color: "hsl(var(--purple))" }}>PACKAGES</span></h2>
              <p className="text-sm text-muted-foreground">Real services delivered on-chain — pay with SOL, results start immediately</p>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map((p) => (
              <SectionReveal key={p.key}>
                <div
                  className="card-glass rounded-2xl p-6 relative transition-all hover:-translate-y-1.5 duration-300 h-full flex flex-col"
                  style={{
                    border: `1px solid hsl(${p.color} / ${p.popular ? "0.6" : "0.22"})`,
                    boxShadow: p.popular ? `0 0 50px hsl(${p.color} / 0.18)` : "none",
                  }}
                >
                  {p.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", color: "white" }}>
                      ⭐ MOST POPULAR
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{p.name}</div>
                    <div className="text-3xl font-black" style={{ color: `hsl(${p.color})` }}>{p.price}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.duration} promotion</div>
                  </div>
                  <ul className="space-y-2.5 flex-1 mb-6">
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: `hsl(${p.color})` }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      handlePkgSelect(p.key);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                    style={p.popular ? {
                      background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.7))",
                      color: "white",
                      boxShadow: "0 0 24px hsl(var(--purple) / 0.35)",
                    } : {
                      border: `1px solid hsl(${p.color} / 0.4)`,
                      color: `hsl(${p.color})`,
                      background: `hsl(${p.color} / 0.08)`,
                    }}
                  >
                    {p.price === "Free" ? "Start Free" : `Select — ${p.price}`}
                  </button>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Strategy Selection Preview ── */}
      <section className="py-20 px-4" style={{ background: "hsl(var(--background))" }}>
        <div className="container max-w-5xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5 border" style={{ background: "hsl(var(--cyan) / 0.12)", color: "hsl(var(--cyan))", borderColor: "hsl(var(--cyan) / 0.3)" }}>
                <Target className="w-3.5 h-3.5" /> Choose Your Strategy
              </div>
              <h2 className="text-3xl font-black mb-3">PICK YOUR <span style={{ color: "hsl(var(--purple))" }}>GROWTH MODE</span></h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">Select the strategy that fits your token's needs</p>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.values(STRATEGIES).map((s) => (
              <SectionReveal key={s.key}>
                <div className="card-glass rounded-2xl p-6 border border-border hover:border-purple transition-all hover:-translate-y-1 duration-300">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <h3 className="font-black text-base mb-2">{s.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{s.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Est. Reach</span>
                      <span className="font-bold" style={{ color: "hsl(var(--cyan))" }}>{s.estimatedReach}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Engagement</span>
                      <span className="font-bold" style={{ color: "hsl(var(--purple))" }}>{s.engagementPotential}</span>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {s.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(var(--cyan))" }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionReveal>
            ))}
          </div>
          <SectionReveal>
            <div className="text-center mt-8">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", color: "white" }}
              >
                🚀 Start Promotion
              </button>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── Earn / Become a Promotion Partner ── */}
      <section className="py-20 px-4 relative overflow-hidden" style={{ background: "hsl(var(--surface-1))" }}>
        <div className="absolute inset-0 opacity-25" style={{ background: "radial-gradient(ellipse at bottom right, hsl(var(--purple) / 0.25), transparent 60%)" }} />
        <div className="container max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <SectionReveal>
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-5 border" style={{ background: "hsl(var(--purple) / 0.15)", color: "hsl(var(--purple))", borderColor: "hsl(var(--purple) / 0.35)" }}>
                  <Crown className="w-3.5 h-3.5" /> EARN · PARTNER PROGRAM
                </div>
                <h2 className="text-4xl sm:text-5xl font-black mb-4" style={{ lineHeight: 1.1 }}>
                  Have a Telegram channel? <span style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Earn up to 10%</span> on every promotion.
                </h2>
                <p className="text-base text-muted-foreground mb-6">
                  Turn your existing audience into passive SOL income. Connect your channel, get auto-tiered by subscriber count, share your referral link — earn % on every paid campaign that flows through it.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { icon: CheckCircle2, t: "No quota, no exclusivity, no contracts" },
                    { icon: CheckCircle2, t: "Tier auto-upgrades as your channel grows" },
                    { icon: CheckCircle2, t: "Paid in SOL — instant on-chain settlement" },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <b.icon className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--cyan))" }} />
                      <span className="text-foreground/90">{b.t}</span>
                    </div>
                  ))}
                </div>
                <Link to="/partner/apply"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))", boxShadow: "0 0 40px hsl(var(--purple) / 0.4)" }}>
                  <DollarSign className="w-5 h-5" /> Become a Partner <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </SectionReveal>
            <SectionReveal>
              <div className="card-glass rounded-3xl p-6 border" style={{ borderColor: "hsl(var(--purple) / 0.3)", boxShadow: "0 0 60px hsl(var(--purple) / 0.15)" }}>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">Partner Tiers</div>
                <div className="space-y-2">
                  {[
                    { tier: "Starter", subs: "1K+", pct: "1%" },
                    { tier: "Growth", subs: "3K+", pct: "2%" },
                    { tier: "Pro", subs: "5K+", pct: "3%" },
                    { tier: "Elite", subs: "10K+", pct: "5%" },
                    { tier: "Whale", subs: "20K+", pct: "7%" },
                    { tier: "Legend", subs: "30K+", pct: "10%", highlight: true },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.highlight ? "linear-gradient(90deg, hsl(var(--purple) / 0.15), hsl(var(--cyan) / 0.1))" : "hsl(var(--surface-2))", border: t.highlight ? "1px solid hsl(var(--cyan) / 0.4)" : "1px solid transparent" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className="font-bold text-sm">{t.tier}</span>
                        {t.highlight && <Crown className="w-3.5 h-3.5" style={{ color: "hsl(45 100% 55%)" }} />}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{t.subs} subs</span>
                        <span className="text-xl font-black tabular-nums" style={{ color: "hsl(var(--cyan))" }}>{t.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                  Example: 30K-sub channel × 50 promos/mo @ 0.5 SOL = <span className="font-bold" style={{ color: "hsl(var(--cyan))" }}>2.5 SOL/mo passive</span>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover" }} />
        <div className="absolute inset-0" style={{ background: "hsl(var(--background) / 0.88)" }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <SectionReveal>
            <div className="text-5xl mb-5">🚀</div>
            <h2 className="text-4xl font-black mb-4">YOUR TOKEN, <span style={{ color: "hsl(var(--purple))" }}>IN FRONT OF BUYERS</span> — IN MINUTES</h2>
            <p className="text-muted-foreground mb-8 text-base">Submit your contract, choose a package, and watch your campaign go live across our opt-in community network.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="px-10 py-4 rounded-xl font-bold text-base transition-all active:scale-95 hover:opacity-90"
              style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", color: "white", boxShadow: "0 0 40px hsl(var(--purple) / 0.4)" }}
            >
              🔥 Promote My Token Now
            </button>
          </SectionReveal>
        </div>
      </section>

      {/* ── Explore Platform Section ── */}
      <section className="py-20 px-4" style={{ background: "hsl(var(--surface-1))" }}>
        <div className="container max-w-5xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">EXPLORE THE <span style={{ color: "hsl(var(--purple))" }}>PLATFORM</span></h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">Everything you need to promote, track, and grow your Solana memecoin.</p>
            </div>
          </SectionReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { to: "/launch-token", emoji: "🚀", title: "Launch Token", desc: "Create your Solana token, attach metadata and open liquidity in one signed flow." },
              { to: "/audit-token", emoji: "🛡️", title: "Audit Token", desc: "Score any Solana mint 0–100 for DEX readiness with one-click Fix-Now actions." },
              { to: "/memecoin-promotion", emoji: "📣", title: "Memecoin Promotion", desc: "AI-powered multi-platform promotion across Twitter/X, Telegram & Discord." },
              { to: "/top-promoted-tokens", emoji: "🔥", title: "Trending Memecoins", desc: "Real-time leaderboard of the hottest Solana tokens right now." },
              { to: "/recently-added-tokens", emoji: "⚡", title: "Recently Added Tokens", desc: "Fresh launches just submitted to our platform — be first to discover." },
              { to: "/crypto-marketing-tool", emoji: "🛠️", title: "Crypto Marketing Tool", desc: "AI content generation and multi-channel campaign management." },
              { to: "/promote-pumpfun-token", emoji: "🎯", title: "Pump.fun Promotion", desc: "Specialized launch boost for Pump.fun tokens — go viral instantly." },
              { to: "/telegram-crypto-promotion", emoji: "✈️", title: "Telegram Promotion", desc: "Reach active crypto communities through our opt-in Telegram network." },
              { to: "/blog", emoji: "📖", title: "Blog & Guides", desc: "Strategy guides, how-tos and crypto marketing tips from our team." },
            ].map((item) => (
              <SectionReveal key={item.to}>
                <Link
                  to={item.to}
                  className="card-glass rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300 border border-border hover:border-purple group block"
                >
                  <div className="text-3xl">{item.emoji}</div>
                  <div>
                    <div className="font-black text-sm mb-1 group-hover:text-primary transition-colors">{item.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold group-hover:gap-2 transition-all" style={{ color: "hsl(var(--purple))" }}>
                    Explore <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 px-4 scroll-mt-24" style={{ background: "hsl(var(--background))" }}>
        <div className="container max-w-5xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">
                HOW <span style={{ color: "hsl(var(--cyan))" }}>IT WORKS</span>
              </h2>
              <p className="text-sm text-muted-foreground">Get real buyers for your memecoin in 3 simple steps</p>
            </div>
          </SectionReveal>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <SectionReveal key={i}>
                <div className="card-glass rounded-2xl p-6 border border-border text-center relative overflow-hidden">
                  <div className="absolute top-3 right-3 text-4xl font-black opacity-5">{s.n}</div>
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-5xl font-black mb-3" style={{ color: "hsl(var(--purple) / 0.3)" }}>{s.n}</div>
                  <h3 className="font-black text-base mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </SectionReveal>
            ))}
          </div>
          <SectionReveal>
            <div className="text-center mt-10">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", color: "white" }}
              >
                🚀 Promote Your Token Now
              </button>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20 px-4" style={{ background: "hsl(var(--surface-1))" }}>
        <div className="container max-w-5xl">
          <SectionReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3">
                WHAT <span style={{ color: "hsl(var(--purple))" }}>DEGENS SAY</span>
              </h2>
              <p className="text-sm text-muted-foreground">Real results from real token devs</p>
            </div>
          </SectionReveal>
          <div className="grid md:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <SectionReveal key={i}>
                <div className="card-glass rounded-2xl p-5 border border-border hover:border-purple transition-all">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current" style={{ color: "hsl(var(--cyan))" }} />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-4 text-foreground/85">"{t.text}"</p>
                  <span className="text-xs font-mono" style={{ color: "hsl(var(--purple))" }}>{t.handle}</span>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border) / 0.6)" }}>
        {/* Disclaimer — toned down so it informs without scaring users */}
        <div className="border-b py-3 px-4" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
          <div className="container max-w-4xl">
            <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
              {DISCLAIMER}
            </p>
          </div>
        </div>
        <div className="py-12 px-4">
          <div className="container max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <img src={logoIcon} alt="PromoteMyMemes" className="w-8 h-8 object-contain" />
                  <span className="font-black text-base" style={{ background: "linear-gradient(90deg, hsl(var(--purple)), hsl(var(--cyan)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PromoteMyMemes</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">Launch, audit and promote Solana memecoins. One signature deploy, on-chain Metaplex metadata, LP locking and AI promotion across Telegram, X, Discord, Instagram & Reddit.</p>
                <div className="flex gap-3">
                  <a href="https://x.com/sniper44583" target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-border hover:border-primary transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a href="https://t.me/promotememesai" target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-border hover:border-primary transition-colors" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Send className="w-4 h-4" />
                  </a>
                </div>
              </div>
              {/* Platform */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Platform</h4>
                <ul className="space-y-2 text-xs">
                  {[
                    { to: "/launch-token", label: "🚀 Launch Token" },
                    { to: "/audit-token", label: "🛡️ Audit Token" },
                    { to: "/token-tools/metadata", label: "🖼️ Metadata Tool" },
                    { to: "/token-tools/liquidity", label: "💧 Liquidity Pool" },
                    { to: "/token-tools/indexers", label: "📡 Submit to Indexers" },
                    { to: "/memecoin-promotion", label: "📣 Memecoin Promotion" },
                  ].map(l => (
                    <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
              {/* Discover */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Discover</h4>
                <ul className="space-y-2 text-xs">
                  {[
                    { to: "/top-promoted-tokens", label: "🔥 Trending Memecoins" },
                    { to: "/top-promoted-tokens", label: "🏆 Leaderboard" },
                    { to: "/recently-added-tokens", label: "⚡ New Tokens" },
                    { to: "/top-solana-memecoins", label: "Top Solana Memecoins" },
                    { to: "/top-pumpfun-memecoins", label: "Top Pump.fun Tokens" },
                    { to: "/top-new-memecoins", label: "Top New Memecoins" },
                  ].map(l => (
                    <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
              {/* Grow */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Grow</h4>
                <ul className="space-y-2 text-xs">
                  {[
                    { to: "/ai-promo", label: "🧠 AI Promo Studio" },
                    { to: "/campaign-engine", label: "🎯 Campaign Engine" },
                    { to: "/viral-loop", label: "🔄 Viral Loop" },
                    { to: "/community", label: "🌐 Community Hub" },
                    { to: "/partner/apply", label: "👑 Earn as Partner" },
                  ].map(l => (
                    <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
              {/* Resources */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Guides</h4>
                <ul className="space-y-2 text-xs">
                  {[
                    { to: "/blog", label: "📖 Blog & Guides" },
                    { to: "/blog/how-to-promote-memecoin-2026", label: "Promote Memecoin 2026" },
                    { to: "/blog/best-crypto-marketing-strategies", label: "Crypto Marketing" },
                    { to: "/blog/pump-fun-token-launch-strategy", label: "Pump.fun Launch" },
                    { to: "/blog/telegram-memecoin-marketing-guide", label: "Telegram Marketing" },
                    { to: "/blog/solana-memecoin-marketing-2026", label: "Solana Marketing" },
                  ].map(l => (
                    <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
              <p>© {new Date().getFullYear()} PromoteMyMemes. All rights reserved. | Crypto trading involves risk. DYOR.</p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/launch-token" className="hover:text-foreground transition-colors">Launch</Link>
                <Link to="/audit-token" className="hover:text-foreground transition-colors">Audit</Link>
                <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
                <Link to="/top-promoted-tokens" className="hover:text-foreground transition-colors">Trending</Link>
                <Link to="/recently-added-tokens" className="hover:text-foreground transition-colors">New Tokens</Link>
                <Link to="/partner/apply" className="hover:text-foreground transition-colors">Earn</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Social Proof Toast ── */}
      <SocialProofToast />
    </div>
  );
}


