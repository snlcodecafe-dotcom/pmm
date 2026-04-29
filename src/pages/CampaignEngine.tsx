import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Zap, Activity, CheckCircle2, Clock, Play, Pause, BarChart3,
  Send, Twitter, MessageSquare, Loader2, AlertCircle, ChevronRight,
  Target, TrendingUp, Users, Eye, Calendar, RefreshCw, Wallet,
  Shield, Star, ArrowRight, Globe
} from "lucide-react";
import { STRATEGIES, TONES, calculateDynamicPrice, type StrategyKey, type ToneKey } from "@/lib/planConfig";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { usePackages } from "@/hooks/usePackages";

// ── Types ─────────────────────────────────────────────────────────────────────

type Campaign = {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  token_symbol: string | null;
  token_address: string | null;
  description: string | null;
  target_participants: number | null;
  current_participants: number | null;
  reward_pool: number | null;
  end_time: string | null;
  start_time: string;
  created_at: string;
};

type TokenSubmission = {
  id: string;
  token_address: string;
  token_symbol: string | null;
  promotion_type: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  views: number | null;
};

// ── Package Config ─────────────────────────────────────────────────────────────

// PACKAGES are now loaded dynamically via usePackages hook
// ── Campaign Status Badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: "Pending",   color: "hsl(45 100% 55%)",   bg: "hsl(45 100% 55% / 0.15)" },
    active:    { label: "Active",    color: "hsl(120 70% 55%)",   bg: "hsl(120 70% 55% / 0.15)" },
    completed: { label: "Completed", color: "hsl(var(--cyan))",   bg: "hsl(var(--cyan) / 0.12)" },
    paused:    { label: "Paused",    color: "hsl(0 70% 60%)",     bg: "hsl(0 70% 60% / 0.12)" },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
}

// ── Countdown ──────────────────────────────────────────────────────────────────

function Countdown({ endTime }: { endTime: string | null }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!endTime) { setLabel("—"); return; }
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setLabel("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return <span className="font-mono text-xs">{label}</span>;
}

// ── Platform Pill ──────────────────────────────────────────────────────────────

function PlatformPill({ p }: { p: string }) {
  const map: Record<string, { icon: string; color: string }> = {
    "Twitter/X": { icon: "𝕏", color: "hsl(210 100% 60%)" },
    "Telegram":  { icon: "✈️", color: "hsl(200 90% 55%)" },
    "Discord":   { icon: "💬", color: "hsl(235 85% 65%)" },
    "Instagram": { icon: "📸", color: "hsl(330 80% 55%)" },
    "Reddit":    { icon: "🔴", color: "hsl(16 100% 50%)" },
  };
  const info = map[p] || { icon: "📢", color: "hsl(var(--cyan))" };
  return (
    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ color: info.color, borderColor: `${info.color}40`, background: `${info.color}12` }}>
      {info.icon} {p}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CampaignEngine() {
  const { wallet, connect, sendSol } = useSolanaWallet();
  const { packages: PACKAGES } = usePackages();
  const [searchParams] = useSearchParams();

  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [selectedPkg, setSelectedPkg] = useState("starter");
  const [submitStep, setSubmitStep] = useState<"idle" | "paying" | "confirming" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [adminWallet, setAdminWallet] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [myTokens, setMyTokens] = useState<TokenSubmission[]>([]);
  const [activeTab, setActiveTab] = useState<"launch" | "active" | "network">("launch");
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyKey>("organic_growth");
  const [selectedTone, setSelectedTone] = useState<ToneKey>("professional");
  const [postFrequency, setPostFrequency] = useState<"low" | "medium" | "high">("medium");

  const pkg = PACKAGES.find(p => p.key === selectedPkg) || PACKAGES[0];
  const basePackagePrice = Number(pkg?.priceSol || 0);
  const adjustedPackagePrice = calculateDynamicPrice(basePackagePrice, pkg?.platforms || [], selectedStrategy, postFrequency);
  const packagePrice = basePackagePrice > 0 ? adjustedPackagePrice : 0;
  const packagePriceLabel = packagePrice === 0 ? "Free" : `${packagePrice} SOL`;
  const basePackagePriceLabel = basePackagePrice === 0 ? "Free" : `${basePackagePrice} SOL`;

  useEffect(() => {
    const queryTokenAddress = searchParams.get("tokenAddress");
    const queryTokenSymbol = searchParams.get("tokenSymbol");

    if (queryTokenAddress) setTokenAddress(queryTokenAddress);
    if (queryTokenSymbol) setTokenSymbol(queryTokenSymbol.toUpperCase());
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [campaignsRes, adminRes, tokensRes] = await Promise.all([
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("admin_settings").select("value").eq("key", "admin_wallet").single(),
      supabase.from("token_submissions").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    if (campaignsRes.data) setCampaigns(campaignsRes.data as Campaign[]);
    if (adminRes.data) setAdminWallet(adminRes.data.value);
    if (tokensRes.data) setMyTokens(tokensRes.data as TokenSubmission[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddress.trim()) return;

    // Gate: require login before submitting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSubmitError("Please sign in to submit a token.");
      setSubmitStep("error");
      window.location.href = `/auth?next=${encodeURIComponent("/campaign-engine")}`;
      return;
    }

    const pkg = PACKAGES.find(p => p.key === selectedPkg);
    if (!pkg) { setSubmitError("Invalid package"); setSubmitStep("error"); return; }

    setSubmitError("");
      setSubmitStep(packagePrice > 0 ? "paying" : "confirming");

    let txSig: string | null = null;

    if (packagePrice > 0) {
      if (!adminWallet || adminWallet === "NOT_SET") {
        setSubmitError("Payment destination not configured.");
        setSubmitStep("error");
        return;
      }
      try {
        txSig = await sendSol(adminWallet, packagePrice);
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
      const refCode = localStorage.getItem("pm_ref_code") || undefined;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": ANON_KEY,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tokenAddress: tokenAddress.trim(),
          tokenSymbol: tokenSymbol.trim() || undefined,
          promotionType: pkg.dbPromotionType,
          walletAddress: wallet.publicKey,
          txSignature: txSig,
          referralCode: refCode,
          packageConfig: {
            key: pkg.key,
            name: pkg.name,
            priceSol: packagePrice,
            duration: pkg.duration,
            deliverables: pkg.deliverables,
            platforms: pkg.platforms,
            features: pkg.features,
            dbPromotionType: pkg.dbPromotionType,
            strategy: packagePrice > 0 ? selectedStrategy : null,
            tone: packagePrice > 0 ? selectedTone : null,
            postFrequency: packagePrice > 0 ? postFrequency : null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitStep("success");
      setTimeout(() => {
        setSubmitStep("idle");
        setTokenAddress("");
        setTokenSymbol("");
        loadData();
      }, 4000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
      setSubmitStep("error");
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === "active");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

  return (
    <main className="app-page-shell">
      <SEOHead
        title="Campaign Engine — PromoteMyMemes | Launch Memecoin Campaigns"
        description="Launch multi-platform memecoin promotion campaigns. Basic, Growth & Viral packages for Solana tokens. AI-driven promotion across Telegram, Twitter/X & Discord."
        canonical="/campaign-engine"
        keywords="memecoin campaign, token promotion campaign, crypto marketing campaign, telegram memecoin campaign"
      />

      

      <div className="app-shell-container pb-16">

          {/* ── Page Header ── */}
          <div className="mb-10 text-center">
            <div className="app-eyebrow mb-4">
              <Target className="w-3.5 h-3.5" /> Real Promotion Campaigns
            </div>
            <h1 className="app-headline mb-3">
              Campaign <span className="gradient-text-purple">Engine</span>
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Launch structured multi-platform campaigns. Schedule posts, reach opt-in networks, track real engagement.
            </p>
          </div>

          {/* ── Tab Bar ── */}
          <div className="app-tabbar mb-8">
            {[
              { key: "launch", label: "Launch Campaign", icon: <Zap className="w-4 h-4" /> },
              { key: "active", label: `Active (${activeCampaigns.length})`, icon: <Activity className="w-4 h-4" /> },
              { key: "network", label: "Distribution Network", icon: <Globe className="w-4 h-4" /> },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`app-tab -mb-px ${activeTab === t.key ? "app-tab-active" : ""}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── Launch Campaign Tab ── */}
          {activeTab === "launch" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              {/* Package Cards */}
              <div className="lg:col-span-3 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Select Campaign Package</h2>
                {PACKAGES.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { setSelectedPkg(p.key); setSubmitStep("idle"); setSubmitError(""); }}
                    className="app-panel w-full rounded-2xl p-5 text-left transition-all"
                    style={{
                      background: selectedPkg === p.key ? `${p.color}10` : "hsl(var(--surface-1))",
                      borderColor: selectedPkg === p.key ? p.color : "hsl(var(--border))",
                      boxShadow: selectedPkg === p.key ? `0 0 30px ${p.color}20` : "none",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-lg">{p.icon}</span>
                          <span className="text-base font-semibold">{p.name}</span>
                          {p.popular && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))", color: "white" }}>POPULAR</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.duration}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold" style={{ color: p.color }}>{p.price}</div>
                        <div className="text-[10px] text-muted-foreground">per campaign</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.platforms.map(pl => <PlatformPill key={pl} p={pl} />)}
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: p.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              {/* Launch Form */}
              <div className="lg:col-span-2">
                <div className="sticky top-20">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Customize Package</h2>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="app-panel rounded-2xl p-6">
                          <div className="mb-5 p-3 rounded-xl" style={{ background: `${pkg.color}10`, border: `1px solid ${pkg.color}30` }}>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold" style={{ color: pkg.color }}>{pkg.name} Package</span>
                              <span className="font-black" style={{ color: pkg.color }}>{packagePriceLabel}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              <Clock className="w-3 h-3" /> {pkg.duration}
                            </div>
                            {basePackagePrice > 0 && (
                              <div className="text-xs text-muted-foreground mt-2">
                                Base: {basePackagePriceLabel} → adjusted by strategy & frequency
                              </div>
                            )}
                          </div>

                          {basePackagePrice > 0 && (
                            <>
                              <div className="mb-4">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Growth Strategy</label>
                                <div className="grid grid-cols-1 gap-2">
                                  {Object.values(STRATEGIES).map(s => (
                                    <button
                                      key={s.key}
                                      type="button"
                                      onClick={() => setSelectedStrategy(s.key)}
                                      className="text-left rounded-lg p-3 transition-all text-xs border"
                                      style={{
                                        background: selectedStrategy === s.key ? "hsl(var(--purple) / 0.12)" : "hsl(var(--surface-2))",
                                        borderColor: selectedStrategy === s.key ? "hsl(var(--purple) / 0.5)" : "hsl(var(--border))",
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span>{s.icon}</span>
                                        <span className="font-bold" style={{ color: selectedStrategy === s.key ? "hsl(var(--purple))" : "inherit" }}>{s.name}</span>
                                        <span className="ml-auto text-[10px] text-muted-foreground">{s.estimatedReach} reach</span>
                                      </div>
                                      <div className="text-muted-foreground">{s.description}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="mb-4">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Message Tone</label>
                                <div className="flex flex-wrap gap-2">
                                  {Object.values(TONES).map(t => (
                                    <button
                                      key={t.key}
                                      type="button"
                                      onClick={() => setSelectedTone(t.key)}
                                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all border"
                                      style={{
                                        background: selectedTone === t.key ? "hsl(var(--cyan) / 0.15)" : "hsl(var(--surface-2))",
                                        color: selectedTone === t.key ? "hsl(var(--cyan))" : "hsl(var(--muted-foreground))",
                                        borderColor: selectedTone === t.key ? "hsl(var(--cyan) / 0.5)" : "hsl(var(--border))",
                                      }}
                                    >
                                      {t.icon} {t.name}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Post Frequency</label>
                                <div className="flex gap-2">
                                  {(["low", "medium", "high"] as const).map(f => (
                                    <button
                                      key={f}
                                      type="button"
                                      onClick={() => setPostFrequency(f)}
                                      className="flex-1 text-xs py-2 rounded-lg font-semibold transition-all border capitalize"
                                      style={{
                                        background: postFrequency === f ? "hsl(var(--purple) / 0.15)" : "hsl(var(--surface-2))",
                                        color: postFrequency === f ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))",
                                        borderColor: postFrequency === f ? "hsl(var(--purple) / 0.5)" : "hsl(var(--border))",
                                      }}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div>
                          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Token Details</h2>
                          <div className="app-panel rounded-2xl p-6">
                            <div className="mb-4">
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                                Token Contract Address *
                              </label>
                              <input
                                type="text"
                                value={tokenAddress}
                                onChange={e => setTokenAddress(e.target.value)}
                                placeholder="Solana token address…"
                                required
                                disabled={submitStep !== "idle" && submitStep !== "error"}
                                className="w-full rounded-lg px-4 py-3 text-sm font-mono focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                                style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                              />
                            </div>

                            <div className="mb-5">
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                                Token Symbol (optional)
                              </label>
                              <input
                                type="text"
                                value={tokenSymbol}
                                onChange={e => setTokenSymbol(e.target.value.toUpperCase())}
                                placeholder="e.g. BONK"
                                maxLength={12}
                                disabled={submitStep !== "idle" && submitStep !== "error"}
                                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-muted-foreground/40"
                                style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                              />
                            </div>

                            <div className="mb-4 p-3 rounded-xl flex items-start gap-2 text-xs" style={{ background: "hsl(var(--cyan) / 0.07)", border: "1px solid hsl(var(--cyan) / 0.2)", color: "hsl(var(--cyan))" }}>
                              <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>Token will be scanned for risk signals before campaign activates. Spam & duplicate content is blocked automatically.</span>
                            </div>

                            {packagePrice > 0 && !wallet.connected && submitStep === "idle" && (
                              <div className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2" style={{ background: "hsl(var(--purple) / 0.1)", border: "1px solid hsl(var(--purple) / 0.25)", color: "hsl(var(--purple))" }}>
                                <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
                                Connect Phantom wallet to pay {packagePriceLabel}
                              </div>
                            )}

                            {submitStep === "error" && (
                              <div className="mb-4 p-3 rounded-lg flex items-start gap-2 text-sm" style={{ background: "hsl(0 85% 60% / 0.1)", border: "1px solid hsl(0 85% 60% / 0.3)", color: "hsl(0 85% 65%)" }}>
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>{submitError}</span>
                              </div>
                            )}

                            {submitStep === "success" ? (
                              <div className="flex flex-col items-center gap-2 py-5 rounded-xl text-center" style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.3)", color: "hsl(var(--cyan))" }}>
                                <CheckCircle2 className="w-7 h-7" />
                                <span className="font-bold">Campaign Launched!</span>
                                <span className="text-xs opacity-70">Promotion is now active across {pkg.platforms.join(", ")}</span>
                              </div>
                            ) : submitStep === "paying" ? (
                              <div className="flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--purple) / 0.12)", color: "hsl(var(--purple))" }}>
                                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for wallet approval…
                              </div>
                            ) : submitStep === "confirming" ? (
                              <div className="flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-semibold" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))" }}>
                                <Loader2 className="w-4 h-4 animate-spin" /> Scheduling campaign…
                              </div>
                            ) : (
                              <button
                                type="submit"
                                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 hover:opacity-90 flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(270 60% 45%))", color: "white", boxShadow: "0 0 28px hsl(var(--purple) / 0.45)" }}
                              >
                                {packagePrice > 0 && !wallet.connected ? (
                                  <><Wallet className="w-4 h-4" /> Connect & Pay {packagePriceLabel}</>
                                ) : packagePrice > 0 ? (
                                  <><Zap className="w-4 h-4" /> Launch {pkg.name} Campaign — {packagePriceLabel}</>
                                ) : (
                                  <><Play className="w-4 h-4" /> Launch Free Campaign</>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                </div>
              </div>
            </div>
          )}

          {/* ── Active Campaigns Tab ── */}
          {activeTab === "active" && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Active Campaigns</h2>
                  <p className="text-sm text-muted-foreground">Real-time status of running promotions</p>
                </div>
                <button onClick={loadData} disabled={loading} className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))" }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading campaigns…
                </div>
              ) : activeCampaigns.length === 0 && completedCampaigns.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-semibold mb-2">No campaigns yet</p>
                  <p className="text-sm mb-6">Launch your first campaign to see it here</p>
                  <button onClick={() => setActiveTab("launch")} className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: "hsl(var(--purple))", color: "white" }}>
                    Launch Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...activeCampaigns, ...completedCampaigns].map(c => (
                    <div key={c.id} className="app-panel rounded-2xl p-5 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base font-semibold">{c.name}</span>
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            {c.token_symbol && <span className="font-mono font-bold" style={{ color: "hsl(var(--cyan))" }}>${c.token_symbol}</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> <Countdown endTime={c.end_time} /></span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{c.current_participants || 0} / {c.target_participants || 100} participants</div>
                          <div className="w-24 h-1.5 rounded-full mt-1" style={{ background: "hsl(var(--surface-3))" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((c.current_participants || 0) / (c.target_participants || 100)) * 100)}%`, background: "linear-gradient(90deg, hsl(var(--purple)), hsl(var(--cyan)))" }} />
                          </div>
                        </div>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* My recent submissions */}
              {myTokens.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Recent Token Submissions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myTokens.map(t => (
                      <div key={t.id} className="app-panel rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm font-mono" style={{ color: "hsl(var(--cyan))" }}>
                            ${t.token_symbol || t.token_address.slice(0, 6)}
                          </span>
                          <StatusBadge status={t.status} />
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span className="capitalize">{t.promotion_type}</span>
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {t.views || 0}</span>
                        </div>
                        {t.expires_at && (
                          <div className="text-xs mt-1" style={{ color: "hsl(45 100% 55%)" }}>
                            Expires: <Countdown endTime={t.expires_at} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Distribution Network Tab ── */}
          {activeTab === "network" && (
            <div>
                <div className="mb-10 text-center">
                  <h2 className="text-2xl font-semibold mb-2">Distribution Network</h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Our opt-in network of Telegram groups, Discord servers, and social accounts distributes your token content.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10">
                {[
                  { icon: <Send className="w-6 h-6" />, platform: "Telegram", count: "147+", desc: "Opt-in groups across meme / alpha / trading categories", color: "hsl(200 90% 55%)" },
                  { icon: <Twitter className="w-6 h-6" />, platform: "Twitter/X", count: "24h/day", desc: "AI variation scheduler — Pro: 12/day, Ultra: 24/day", color: "hsl(210 100% 60%)" },
                  { icon: <MessageSquare className="w-6 h-6" />, platform: "Discord", count: "89+", desc: "Bot servers with slash commands", color: "hsl(235 85% 65%)" },
                  { icon: <span className="text-2xl">📸</span>, platform: "Instagram", count: "NEW", desc: "Caption-style posts with hashtags & CTA", color: "hsl(330 80% 55%)" },
                  { icon: <span className="text-2xl">🔴</span>, platform: "Reddit", count: "NEW", desc: "Natural storytelling posts for crypto subreddits", color: "hsl(16 100% 50%)" },
                ].map((n, i) => (
                  <div key={i} className="app-panel rounded-2xl p-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${n.color}15`, color: n.color }}>
                      {n.icon}
                    </div>
                    <div className="mb-1 text-sm font-semibold">{n.platform}</div>
                    <div className="mb-1 text-lg font-semibold" style={{ color: n.color }}>{n.count}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>

              {/* Network Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="app-panel rounded-2xl p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Shield className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> Safety & Trust Layer</h3>
                  <ul className="space-y-2.5 text-sm text-muted-foreground">
                    {[
                      "Rate limiting per platform (no spam)",
                      "Content uniqueness check (no duplicates)",
                      "Campaign auto-pause if risk detected",
                      "Honeypot & rug detection before launch",
                      "Cooldown rules per group (1 post/hour)",
                    ].map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--cyan))" }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="app-panel rounded-2xl p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><BarChart3 className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} /> Campaign States</h3>
                  <div className="space-y-3">
                    {[
                      { state: "Pending", desc: "Scheduled — waiting for start time or manual trigger", color: "hsl(45 100% 55%)" },
                      { state: "Active", desc: "Posts live — distribution across all selected platforms", color: "hsl(120 70% 55%)" },
                      { state: "Completed", desc: "Campaign ended — report available for download", color: "hsl(var(--cyan))" },
                      { state: "Paused", desc: "Auto-paused if spam / risk signal detected", color: "hsl(0 70% 60%)" },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="font-semibold" style={{ color: s.color }}>{s.state}</span>
                        <span className="text-muted-foreground text-xs">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">Ready to reach the entire network?</p>
                <button
                  onClick={() => setActiveTab("launch")}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.7))", boxShadow: "0 0 30px hsl(var(--purple) / 0.35)" }}
                >
                  <Zap className="w-4 h-4" /> Launch Your Campaign <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
      </div>
    </main>
  );
}
