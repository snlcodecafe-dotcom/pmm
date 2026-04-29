import { ArrowRight, BarChart3, Compass, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardHeroProps {
  launchesCount: number;
  liveCampaigns: number;
  totalViews: number;
  totalSpend: number;
  campaignsCount: number;
  walletConnected: boolean;
  walletAddress: string | null;
  onConnectWallet: () => void;
}

export function DashboardHero({
  launchesCount,
  liveCampaigns,
  totalViews,
  totalSpend,
  campaignsCount,
  walletConnected,
  walletAddress,
  onConnectWallet,
}: DashboardHeroProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.65fr_0.95fr]">
      <Card className="app-hero">
        <div className="app-hero-grid gap-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5"><Compass className="h-3 w-3" /> Growth Hub</Badge>
              {walletConnected ? (
                <Badge variant="outline" className="gap-1.5 border-border bg-background/50">
                  <Wallet className="h-3 w-3" /> {walletAddress}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border bg-background/50">Connect wallet for token sync</Badge>
              )}
            </div>

            <div className="space-y-3">
              <div className="app-eyebrow">Your launch workspace</div>
              <div>
                <h1 className="app-headline max-w-2xl">See what needs attention, what is live, and what to do next.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  This dashboard keeps token launches, campaign activity, and quick next steps in one focused place so you can move faster without jumping between screens.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="app-gradient-action rounded-full px-5">
                <Link to="/campaign-engine">Start campaign <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-border bg-background/40 px-5">
                <Link to="/launch-token">Launch token</Link>
              </Button>
              {/* Highlighted Audit Token CTA */}
              <Button
                asChild
                className="rounded-full px-5 bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/40 hover:ring-primary/60 transition-all"
              >
                <Link to="/audit-token">
                  <ShieldCheck className="h-4 w-4" /> Audit Token
                </Link>
              </Button>
              {!walletConnected && (
                <Button variant="outline" className="rounded-full border-border bg-background/40 px-5" onClick={onConnectWallet}>
                  Connect wallet
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 self-start sm:grid-cols-3 xl:grid-cols-1">
            <Card className="app-muted-card shadow-none">
              <CardContent className="p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Launched tokens</div>
                <div className="mt-2 text-3xl font-semibold">{launchesCount}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Tokens currently tracked in your workspace.</p>
              </CardContent>
            </Card>
            <Card className="app-muted-card shadow-none">
              <CardContent className="p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Active campaigns</div>
                <div className="mt-2 text-3xl font-semibold">{liveCampaigns}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Campaigns still delivering reach right now.</p>
              </CardContent>
            </Card>
            <Card className="app-muted-card shadow-none">
              <CardContent className="p-5">
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Campaign views</div>
                <div className="mt-2 text-3xl font-semibold">{totalViews.toLocaleString()}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Combined delivered views across your campaign history.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>

      {/* Replaced Quick Access with Campaign Performance */}
      <Card id="campaign-performance" className="app-panel rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <BarChart3 className="h-5 w-5 text-primary" /> Campaign performance
          </CardTitle>
          <CardDescription>Track spend, reach, and active delivery at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {[
            { label: "Total campaigns", value: campaignsCount.toString() },
            { label: "Active now", value: liveCampaigns.toString() },
            { label: "Total spend", value: `${totalSpend.toFixed(2)} SOL` },
            { label: "Views delivered", value: totalViews.toLocaleString() },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-background/50 p-3">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
              <div className="mt-1.5 text-xl font-semibold">{item.value}</div>
            </div>
          ))}
          <Button asChild variant="outline" className="col-span-2 mt-1 w-full justify-between rounded-xl border-border bg-background/40">
            <Link to="/campaign-engine">Start new campaign <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
