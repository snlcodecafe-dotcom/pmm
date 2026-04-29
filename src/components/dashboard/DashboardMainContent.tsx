import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAlphaMemeSniperUrl, getLaunchNextActionLabel, getLaunchResumeStep } from "@/lib/launchProgress";

import { formatAgo, shorten, type TokenLaunch } from "./types";

interface DashboardMainContentProps {
  launches: TokenLaunch[];
}

export function DashboardMainContent({ launches }: DashboardMainContentProps) {
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Token address copied");
    } catch {
      toast.error("Could not copy address");
    }
  };

  const completedSteps = (token: TokenLaunch) =>
    [token.token_created, token.metadata_attached, token.liquidity_added, token.liquidity_locked, token.promotion_started].filter(Boolean).length;

  // P1-1: lightweight client-side readiness score so users see token health on the Dashboard.
  // Mirrors the weights from /audit-token (metadata 25, liquidity 25, lock 25, indexed 25).
  const readiness = (token: TokenLaunch) => {
    const indexed = (token.indexed_dexscreener ? 12 : 0) + (token.indexed_jupiter ? 13 : 0);
    return (token.metadata_attached ? 25 : 0)
      + (token.liquidity_added ? 25 : 0)
      + (token.liquidity_locked ? 25 : 0)
      + indexed;
  };
  const tone = (s: number) =>
    s >= 75 ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
    : s >= 40 ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
    : "border-rose-500/40 bg-rose-500/10 text-rose-500";

  return (
    <Card className="app-panel rounded-2xl">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>My Tokens</CardTitle>
            <CardDescription className="mt-1">Launched tokens synced from your account and connected wallet.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-border bg-background/40">{launches.length} launches</Badge>
            <Badge variant="outline" className="border-border bg-background/40">
              {launches.filter((token) => !token.promotion_started || !token.liquidity_locked || !token.liquidity_added).length} pending setup
            </Badge>
            <Button asChild variant="outline" className="rounded-full border-border bg-background/40">
              <Link to="/launch-token">Launch another</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {launches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No launched tokens yet. Start with a new token launch to unlock campaign actions here.
          </div>
        ) : (
          launches.map((token) => {
            const ready = token.promotion_started && token.liquidity_locked && token.liquidity_added;
            const steps = completedSteps(token);
            return (
              <div
                key={token.id}
                className="rounded-2xl border border-border bg-background/50 p-4 shadow-sm transition-colors hover:bg-background/70 sm:p-5"
              >
                <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto] lg:items-center">
                  {/* Identity */}
                  <div className="flex min-w-0 gap-3">
                    {token.logo_url ? (
                      <img src={token.logo_url} alt={`${token.token_symbol} logo`} className="h-12 w-12 shrink-0 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
                        {token.token_symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold sm:text-lg">{token.token_name}</h3>
                        <Badge variant="secondary">{token.token_symbol}</Badge>
                        <Badge variant="outline" className="border-border bg-background/40 text-[10px] uppercase">{token.network}</Badge>
                        {(() => { const s = readiness(token); return (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone(s)}`} title="Readiness Score (0–100)">
                            {s}/100
                          </span>
                        ); })()}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {shorten(token.mint_address)} · {formatAgo(token.created_at)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-1.5 text-xs" onClick={() => copyAddress(token.mint_address)}>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-1.5 text-xs">
                          <Link to={`/my-tokens/${token.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" /> Details
                          </Link>
                        </Button>
                        <Button asChild type="button" variant="ghost" size="sm" className="h-7 px-1.5 text-xs">
                          <a href={buildAlphaMemeSniperUrl(token.mint_address)} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Sniper
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Token details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Supply</div>
                      <div className="mt-0.5 truncate font-semibold">
                        {token.total_supply ? Number(token.total_supply).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Decimals</div>
                      <div className="mt-0.5 font-semibold">{token.decimals ?? "—"}</div>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Liquidity</div>
                      <div className="mt-0.5 font-semibold">
                        {token.base_amount_sol ? `${Number(token.base_amount_sol).toFixed(2)} SOL` : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-card/60 p-2">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Setup</div>
                      <div className="mt-0.5 font-semibold">{steps}/5 steps</div>
                    </div>
                  </div>

                  {/* Status pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Created", done: token.token_created },
                      { label: "Meta", done: token.metadata_attached },
                      { label: "LP", done: token.liquidity_added },
                      { label: "Locked", done: token.liquidity_locked },
                      { label: "Promo", done: token.promotion_started },
                    ].map((item) => (
                      <span
                        key={item.label}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          item.done
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-background/40 text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" /> {item.label}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:items-end">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full rounded-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary lg:w-auto"
                    >
                      <Link to={`/audit-token/${token.mint_address}`}>
                        <ShieldCheck className="h-3.5 w-3.5" /> Audit Token
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="w-full rounded-full lg:w-auto">
                      <Link
                        to={
                          ready
                            ? `/campaign-engine?tokenAddress=${encodeURIComponent(token.mint_address)}&tokenSymbol=${encodeURIComponent(token.token_symbol)}`
                            : `/launch-token?launchId=${encodeURIComponent(token.id)}&step=${getLaunchResumeStep(token)}`
                        }
                      >
                        {ready ? "Start Campaign" : "Continue Setup"}
                      </Link>
                    </Button>
                    <p className="text-[10px] text-muted-foreground lg:text-right">
                      Next: {getLaunchNextActionLabel(token)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
