import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  Droplets,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Radar,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import TokenOverviewPanel from "@/components/TokenOverviewPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { getPreviousAudit, recordAudit } from "@/lib/auditHistory";

type AuditStatus = "pass" | "warn" | "fail" | "unknown";
interface AuditCheck {
  status: AuditStatus;
  score: number;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  fix?: { label: string; action: string } | null;
  steps?: string[];
}
interface TokenOverview {
  identity: {
    name: string | null; symbol: string | null; logo: string | null; description: string | null;
    decimals: number | null; supplyRaw: string | null; supplyUi: number | null;
    mintAuthority: string | null; freezeAuthority: string | null;
    metadataSource: "on-chain" | "jupiter" | "dexscreener" | "none";
  };
  socials: { website: string | null; twitter: string | null; telegram: string | null; discord: string | null };
  market: {
    priceUsd: number | null; priceNative: number | null; fdv: number | null; marketCap: number | null;
    liquidityUsd: number | null;
    priceChange: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
    volume: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
    txns24h: { buys: number; sells: number };
    pairCreatedAt: string | null; ageDays: number | null;
  };
  pools: Array<{ dex: string; pairAddress: string; quoteSymbol: string; liquidityUsd: number | null; volume24h: number | null; priceUsd: number | null; url: string | null }>;
  topHolders: Array<{ address: string; uiAmount: number; pct: number }>;
  indexers: { dexscreener: boolean; jupiter: boolean; birdeye: boolean };
  links: { solscan: string; explorer: string; dexscreener: string; birdeye: string; jupiter: string };
}
interface AuditReport {
  mint: string;
  network: "mainnet" | "devnet";
  fetchedAt: string;
  scoreTotal: number;
  ready: boolean;
  checks: {
    authority: AuditCheck;
    metadata: AuditCheck;
    liquidity: AuditCheck;
    indexing: AuditCheck;
    holders: AuditCheck;
    activity: AuditCheck;
  };
  missingSteps: string[];
  overview?: TokenOverview;
}

type CheckKey = keyof AuditReport["checks"];

// Standalone post-launch tool routes — never re-enter the launch wizard for an existing token.
const ACTION_ROUTES: Record<string, { to: string; external?: boolean }> = {
  revoke_authority: { to: "/launch-token?step=6" },
  upload_metadata: { to: "/token-tools/metadata" },
  add_liquidity: { to: "/token-tools/liquidity" },
  lock_liquidity: { to: "/token-tools/liquidity" },
  submit_indexers: { to: "/token-tools/indexers" },
  promote: { to: "/campaign-engine" },
};

function actionTarget(action?: string, mint?: string) {
  if (!action) return { to: "/dashboard", external: false };
  const base = ACTION_ROUTES[action] ?? { to: "/dashboard", external: false };
  if (base.external) return base;
  const sep = base.to.includes("?") ? "&" : "?";
  return { to: mint ? `${base.to}${sep}mint=${mint}` : base.to, external: false };
}

// ---------- Risk presentation layer ----------
// Maps backend check status → user-facing severity & friendly copy.

type Severity = "high" | "medium" | "safe" | "unknown";

const SEVERITY_STYLES: Record<Severity, { label: string; emoji: string; chip: string; ring: string; dot: string }> = {
  high: {
    label: "High Risk",
    emoji: "🔴",
    chip: "bg-rose-500/10 text-rose-500 border-rose-500/30",
    ring: "border-rose-500/40",
    dot: "bg-rose-500",
  },
  medium: {
    label: "Medium Risk",
    emoji: "🟠",
    chip: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    ring: "border-amber-500/40",
    dot: "bg-amber-500",
  },
  safe: {
    label: "Safe",
    emoji: "🟢",
    chip: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    ring: "border-emerald-500/40",
    dot: "bg-emerald-500",
  },
  unknown: {
    label: "Unknown",
    emoji: "⚪",
    chip: "bg-muted text-muted-foreground border-border",
    ring: "border-border",
    dot: "bg-muted-foreground",
  },
};

const CHECK_ICON: Record<CheckKey, typeof ShieldCheck> = {
  authority: Lock,
  metadata: FileText,
  liquidity: Droplets,
  indexing: Radar,
  holders: Users,
  activity: Zap,
};

// Per-check, per-status user-friendly copy + CTA labels.
// Backend already returns a status + fix.action — we map to plain English.
const RISK_COPY: Record<CheckKey, {
  // Title & explanation depending on status
  failTitle: string; warnTitle: string; safeTitle: string;
  failExplain: string; warnExplain: string;
  whyItMatters: string;
  failCta: string; warnCta: string;
  trustBadge?: string;
}> = {
  authority: {
    failTitle: "Mint / Freeze Authority Active",
    warnTitle: "Authority Partially Revoked",
    safeTitle: "Ownership Safe",
    failExplain: "You can still create new tokens or freeze wallets. Buyers see this as rug risk.",
    warnExplain: "One authority is still active. Serious buyers prefer fully renounced tokens.",
    whyItMatters: "If buyers think you can mint more or freeze their wallet, they will not buy. Renouncing locks in trust and unlocks DEX listings.",
    failCta: "Revoke Authority",
    warnCta: "Revoke Remaining Authority",
    trustBadge: "Ownership Safe",
  },
  metadata: {
    failTitle: "Mutable / Missing Metadata",
    warnTitle: "Incomplete Metadata",
    safeTitle: "Verified Token Identity",
    failExplain: "Your token has no name, logo or socials on-chain — wallets show it as 'Unknown Token'.",
    warnExplain: "Basic identity is set, but description, logo or socials are missing.",
    whyItMatters: "Buyers do not trust tokens with no logo or socials. Complete metadata is the #1 driver of clicks on DexScreener and Jupiter.",
    failCta: "Verify Token",
    warnCta: "Improve Metadata",
    trustBadge: "Verified Token",
  },
  liquidity: {
    failTitle: "LP Risk: Unlocked or Too Thin",
    warnTitle: "Low Liquidity",
    safeTitle: "Liquidity Healthy",
    failExplain: "Either no real pool, very low liquidity, or most LP tokens are unlocked — owner can pull at any time.",
    warnExplain: "The pool is thin or has very few LP providers. Even small buys cause big slippage.",
    whyItMatters: "No liquidity = no buyers. Unlocked LP = rug risk. Aggregators hide tokens with under $1,000 in the pool. Lock LP and add depth to unlock buyer trust.",
    failCta: "Lock & Add Liquidity",
    warnCta: "Add Liquidity",
    trustBadge: "Liquidity Healthy",
  },
  indexing: {
    failTitle: "Not Listed on Aggregators",
    warnTitle: "Partially Indexed",
    safeTitle: "Fully Indexed",
    failExplain: "DexScreener, Jupiter and Birdeye don't show your token — buyers cannot find it when searching.",
    warnExplain: "You're listed on some aggregators but missing others. You're losing free traffic.",
    whyItMatters: "Most buyers search Jupiter or DexScreener first. If you're not there, you don't exist for them — even if your token is great.",
    failCta: "Submit to Aggregators",
    warnCta: "Complete Listings",
    trustBadge: "Indexed Everywhere",
  },
  holders: {
    failTitle: "High Holder Concentration",
    warnTitle: "Whale / Single-Holder Risk",
    safeTitle: "Healthy Distribution",
    failExplain: "A single wallet (or a handful) holds most of the supply. One sell can crash the price by 50%+.",
    warnExplain: "Top wallets — or one single wallet — hold a large chunk. Buyers worry about a sudden dump.",
    whyItMatters: "Smart buyers always check the top holders. Tokens with whale concentration get skipped. Distribution = confidence.",
    failCta: "Improve Distribution",
    warnCta: "Improve Distribution",
    trustBadge: "Fair Distribution",
  },
  activity: {
    failTitle: "No Trading Activity",
    warnTitle: "Low Trading Activity",
    safeTitle: "Active Trading",
    failExplain: "Zero buys / sells in 24h. Aggregators auto-hide silent tokens.",
    warnExplain: "Some trades, but volume is too low to attract organic buyers.",
    whyItMatters: "Traders only buy what other traders are buying. Volume creates visibility, visibility creates more volume — start the loop.",
    failCta: "Promote Token",
    warnCta: "Boost Promotion",
    trustBadge: "Active & Trending",
  },
};

function statusToSeverity(status: AuditStatus): Severity {
  if (status === "fail") return "high";
  if (status === "warn") return "medium";
  if (status === "pass") return "safe";
  return "unknown";
}

// In-progress tracking lives client-side: clicking "Fix Now" marks the issue
// as ⏳ until the next audit re-run confirms the on-chain state.
const PROGRESS_KEY = "pmm.audit.in_progress";
function getProgress(mint: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${PROGRESS_KEY}.${mint}`);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function setProgress(mint: string, set: Set<string>) {
  try { localStorage.setItem(`${PROGRESS_KEY}.${mint}`, JSON.stringify([...set])); } catch { /* */ }
}

function scoreColor(score: number): { text: string; bar: string; band: "red" | "yellow" | "green"; copy: string } {
  if (score < 50) return { text: "text-rose-500", bar: "bg-rose-500", band: "red", copy: "Your token has serious risks. Fix the items below to attract buyers." };
  if (score < 75) return { text: "text-amber-500", bar: "bg-amber-500", band: "yellow", copy: "You're getting there. Resolve the remaining issues to unlock buyer trust." };
  return { text: "text-emerald-500", bar: "bg-emerald-500", band: "green", copy: "Your token looks safe. Promote with confidence." };
}

export default function AuditToken() {
  const params = useParams<{ address?: string }>();
  const [search] = useSearchParams();
  const initial = params.address || search.get("mint") || "";
  const [mint, setMint] = useState(initial);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<{ score: number; ready: boolean; at: string } | null>(null);
  const [inProgress, setInProgressState] = useState<Set<string>>(new Set());

  const runAudit = async (address: string) => {
    if (!address || address.length < 32) {
      setError("Enter a valid Solana mint address.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    setPrevious(getPreviousAudit(address.trim()));
    try {
      const { data, error } = await supabase.functions.invoke("token-audit", {
        body: { mint: address.trim(), network: "mainnet" },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error?: string }).error || "Audit failed");
      const r = data as AuditReport;
      setReport(r);
      recordAudit(address.trim(), r.scoreTotal, r.ready);
      // Clear in-progress flags for any check that now passes — fix is confirmed.
      const stored = getProgress(address.trim());
      (Object.entries(r.checks) as [CheckKey, AuditCheck][]).forEach(([k, c]) => {
        if (c.status === "pass") stored.delete(k);
      });
      setProgress(address.trim(), stored);
      setInProgressState(stored);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to run audit");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial) void runAudit(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const markInProgress = (key: CheckKey) => {
    if (!report) return;
    const next = new Set(inProgress);
    next.add(key);
    setInProgressState(next);
    setProgress(report.mint, next);
    toast.success("Marked as in progress. Re-run the audit after fixing to confirm.");
  };

  const copy = async () => {
    if (!mint) return;
    try { await navigator.clipboard.writeText(mint); toast.success("Address copied"); } catch { /* */ }
  };

  const verdict = useMemo(() => {
    if (!report) return null;
    const c = scoreColor(report.scoreTotal);
    return { score: report.scoreTotal, ...c };
  }, [report]);

  const earnedBadges = useMemo(() => {
    if (!report) return [] as string[];
    const badges: string[] = [];
    (Object.entries(report.checks) as [CheckKey, AuditCheck][]).forEach(([key, check]) => {
      if (check.status === "pass" && RISK_COPY[key].trustBadge) {
        badges.push(RISK_COPY[key].trustBadge!);
      }
    });
    return badges;
  }, [report]);

  return (
    <PageLayout showCTABanner={false}>
      <SEOHead
        title="Token Risk Scanner — Find Risks & Fix Them in One Click"
        description="Scan any Solana token for rug, liquidity, ownership and metadata risks. Each issue ships with a one-click fix to make your token safer and more trusted."
        canonical="/audit-token"
        keywords="solana token risk scanner, fix token risks, lock liquidity, verify token, rug check solana"
      />
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6">
          {/* Header */}
          <Card className="app-hero">
            <div className="app-hero-grid gap-8">
              <div className="space-y-5">
                <Badge variant="secondary" className="gap-1.5"><ShieldCheck className="h-3 w-3" /> Risk Scanner + Fix System</Badge>
                <div className="space-y-3">
                  <div className="app-eyebrow">Make your token safer in minutes</div>
                  <h1 className="app-headline max-w-2xl">Find every risk. Fix it from one screen.</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                    Scan any Solana token. For every risk we find, you get a one-click fix — no jargon, no dead-ends. Just safer tokens that buyers trust.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Paste a token mint address"
                    value={mint}
                    onChange={(e) => setMint(e.target.value)}
                    className="bg-background/60"
                  />
                  <Button onClick={() => runAudit(mint)} disabled={loading} className="rounded-full px-5">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                    Scan token
                  </Button>
                </div>
                {error && <p className="text-sm text-rose-500">{error}</p>}
              </div>

              {/* Token Safety Score */}
              <div className="self-start">
                <Card className="app-muted-card shadow-none">
                  <CardContent className="space-y-3 p-5">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Token Safety Score</div>
                    <div className="flex items-end gap-2">
                      <div className={`text-5xl font-bold transition-colors ${verdict ? verdict.text : "text-muted-foreground"}`}>
                        {verdict ? verdict.score : "—"}
                      </div>
                      <div className="pb-1.5 text-sm text-muted-foreground">/ 100</div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${verdict ? verdict.bar : "bg-muted"}`}
                        style={{ width: `${verdict?.score ?? 0}%` }}
                      />
                    </div>
                    {verdict && (
                      <p className="text-xs leading-5 text-muted-foreground">{verdict.copy}</p>
                    )}
                    {verdict && previous && previous.score !== verdict.score && (
                      <div className={`text-[11px] font-medium ${verdict.score >= previous.score ? "text-emerald-500" : "text-rose-500"}`}>
                        {verdict.score >= previous.score ? "▲" : "▼"} {Math.abs(verdict.score - previous.score)} pts vs last scan
                      </div>
                    )}
                    {report?.mint && (
                      <button onClick={copy} className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground hover:bg-accent/10">
                        <span className="truncate">{report.mint}</span>
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </Card>

          {/* Loading skeleton */}
          {loading && !report && (
            <Card className="app-panel rounded-2xl">
              <CardContent className="grid gap-3 p-6 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-background/40" />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Trust Badges (earned) */}
          {report && earnedBadges.length > 0 && (
            <Card className="app-panel rounded-2xl border-emerald-500/30">
              <CardContent className="flex flex-wrap items-center gap-3 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold">Trust badges earned</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.map((b) => (
                    <Badge key={b} className="gap-1 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">
                      <CheckCircle2 className="h-3 w-3" /> {b}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Token Overview */}
          {report?.overview && <TokenOverviewPanel report={report} />}

          {/* Risk cards */}
          {report && (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Risks & fixes</h2>
                  <p className="text-xs text-muted-foreground">Every risk has a one-click fix. Resolve them to raise your safety score.</p>
                </div>
                <div className="text-xs text-muted-foreground">{Object.values(report.checks).filter(c => c.status === "pass").length} / 6 safe</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(Object.entries(report.checks) as [CheckKey, AuditCheck][]).map(([key, check]) => {
                  const severity = statusToSeverity(check.status);
                  const sev = SEVERITY_STYLES[severity];
                  const copy = RISK_COPY[key];
                  const Icon = CHECK_ICON[key];
                  const isFixed = check.status === "pass";
                  const isInProgress = !isFixed && inProgress.has(key);
                  const title = isFixed
                    ? copy.safeTitle
                    : check.status === "warn"
                    ? copy.warnTitle
                    : copy.failTitle;
                  const explain = isFixed
                    ? check.message
                    : check.status === "warn"
                    ? copy.warnExplain
                    : copy.failExplain;
                  const ctaLabel = check.status === "warn" ? copy.warnCta : copy.failCta;

                  return (
                    <Card key={key} className={`app-panel relative overflow-hidden rounded-2xl border ${sev.ring} transition-all hover:shadow-md`}>
                      {/* Severity stripe */}
                      <div className={`absolute left-0 top-0 h-full w-1 ${sev.dot}`} />
                      <CardHeader className="gap-3 pb-3 pl-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base leading-tight">{title}</CardTitle>
                              <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sev.chip}`}>
                                <span>{sev.emoji}</span>
                                {sev.label}
                              </div>
                            </div>
                          </div>
                          {/* Status indicator */}
                          <div className="text-right">
                            {isFixed ? (
                              <Badge className="gap-1 border border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15">
                                <CheckCircle2 className="h-3 w-3" /> Fixed
                              </Badge>
                            ) : isInProgress ? (
                              <Badge className="gap-1 border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15">
                                <Clock className="h-3 w-3 animate-pulse" /> In Progress
                              </Badge>
                            ) : (
                              <Badge className="gap-1 border border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/15">
                                <XCircle className="h-3 w-3" /> Not Fixed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pl-5">
                        <p className="text-sm leading-6 text-foreground/90">{explain}</p>

                        {!isFixed && (
                          <div className="rounded-xl border border-border bg-background/40 p-3">
                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why it matters</div>
                            <p className="text-xs leading-5 text-muted-foreground">{copy.whyItMatters}</p>
                          </div>
                        )}

                        {/* Fix CTA */}
                        {!isFixed && check.fix && (() => {
                          const tgt = actionTarget(check.fix.action, report.mint);
                          return (
                            <Button
                              asChild
                              size="sm"
                              className="w-full rounded-full bg-primary font-semibold shadow-sm hover:bg-primary/90"
                            >
                              {tgt.external ? (
                                <a href={tgt.to} target="_blank" rel="noreferrer" onClick={() => markInProgress(key)}>
                                  {ctaLabel} <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : (
                                <Link to={tgt.to} onClick={() => markInProgress(key)}>
                                  {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              )}
                            </Button>
                          );
                        })()}

                        {!isFixed && !check.fix && check.steps && check.steps.length > 0 && (
                          <details className="rounded-xl border border-border bg-background/40 p-3">
                            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">How to fix manually</summary>
                            <ol className="mt-2 space-y-1.5 text-xs leading-5">
                              {check.steps.map((s, i) => (
                                <li key={i} className="flex gap-2">
                                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-semibold">{i + 1}</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ol>
                          </details>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {report && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/40 p-4">
              <div className="text-xs text-muted-foreground">
                Last scanned {new Date(report.fetchedAt).toLocaleString()} · {report.network}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => runAudit(mint)}>
                  <RefreshCw className="h-3.5 w-3.5" /> Re-scan
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={`https://dexscreener.com/solana/${report.mint}`} target="_blank" rel="noreferrer">
                    DexScreener <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={`https://solscan.io/token/${report.mint}`} target="_blank" rel="noreferrer">
                    Solscan <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <Card className="app-panel rounded-2xl">
              <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <div className="text-base font-semibold">Run your first risk scan</div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Paste any Solana token mint above. We'll surface every risk that's hurting buyer trust — and give you a one-click fix for each one.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button asChild size="sm" className="rounded-full">
                    <Link to="/launch-token">Launch a new token <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/dashboard">Open my dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {report && verdict && verdict.band !== "green" && (
            <Card className={`app-panel rounded-2xl ${verdict.band === "red" ? "border-rose-500/30" : "border-amber-500/30"}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 ${verdict.text}`} />
                  <div>
                    <div className="text-sm font-semibold">Fix the issues above to raise your score</div>
                    <div className="text-xs text-muted-foreground">Each fixed risk increases buyer confidence and unlocks more aggregator visibility.</div>
                  </div>
                </div>
                <Button onClick={() => runAudit(mint)} variant="outline" className="rounded-full">
                  <RefreshCw className="h-4 w-4" /> Re-scan after fixing
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </PageLayout>
  );
}
