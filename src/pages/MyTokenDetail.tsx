import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, Megaphone, Rocket, Share2 } from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { buildAlphaMemeSniperUrl, buildLaunchShareMessage, getLaunchNextActionLabel, getLaunchResumeStep } from "@/lib/launchProgress";
import { dexscreenerUrl } from "@/lib/liquidityProvider";
import { streamflowExplorerUrl } from "@/lib/lpLocker";
import { explorerUrl, type SolanaNetwork } from "@/lib/tokenLauncher";

type LaunchDetail = {
  id: string;
  network: string;
  mint_address: string;
  token_name: string;
  token_symbol: string;
  logo_url: string | null;
  description: string | null;
  total_supply: number;
  decimals: number;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  pool_address: string | null;
  lp_mint: string | null;
  lock_address: string | null;
  lock_unlock_at: string | null;
  metadata_uri: string | null;
  base_amount_sol: number | null;
  quote_amount_tokens: number | null;
  token_created: boolean;
  metadata_attached: boolean;
  liquidity_added: boolean;
  liquidity_locked: boolean;
  indexed_dexscreener: boolean;
  indexed_jupiter: boolean;
  promotion_started: boolean;
  created_at: string;
};

const phaseItems = (launch: LaunchDetail) => [
  { label: "Token created", done: launch.token_created },
  { label: "Metadata attached", done: launch.metadata_attached },
  { label: "Liquidity added", done: launch.liquidity_added },
  { label: "LP locked", done: launch.liquidity_locked },
  { label: "Indexed", done: launch.indexed_dexscreener || launch.indexed_jupiter },
  { label: "Promotion ready", done: launch.promotion_started },
];

export default function MyTokenDetail() {
  const { launchId } = useParams<{ launchId: string }>();
  const [launch, setLaunch] = useState<LaunchDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!launchId) return;
      setLoading(true);
      const { data } = await supabase.from("token_launches").select("*").eq("id", launchId).maybeSingle();
      setLaunch((data as LaunchDetail | null) ?? null);
      setLoading(false);
    };

    void load();
  }, [launchId]);

  const shareMessage = useMemo(() => {
    if (!launch) return "";
    return buildLaunchShareMessage({
      name: launch.token_name,
      symbol: launch.token_symbol,
      mint: launch.mint_address,
      totalSupply: Number(launch.total_supply ?? 0),
      liquiditySummary: launch.liquidity_added
        ? `${Number(launch.base_amount_sol ?? 0).toLocaleString()} SOL + ${Number(launch.quote_amount_tokens ?? 0).toLocaleString()} ${launch.token_symbol}`
        : "Pending setup",
      lockSummary: launch.liquidity_locked
        ? `Enabled until ${launch.lock_unlock_at ? new Date(launch.lock_unlock_at).toLocaleDateString() : "scheduled"}`
        : "Not locked yet",
      website: launch.website,
      twitter: launch.twitter,
      telegram: launch.telegram,
      network: (launch.network as SolanaNetwork) || "mainnet",
    });
  }, [launch]);

  const copyAddress = async () => {
    if (!launch) return;
    try {
      await navigator.clipboard.writeText(launch.mint_address);
      toast.success("Token address copied");
    } catch {
      toast.error("Could not copy address");
    }
  };

  const copyShare = async () => {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success("Share message copied");
    } catch {
      toast.error("Could not copy share message");
    }
  };

  const shareNow = async () => {
    if (!shareMessage) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${launch?.token_name} (${launch?.token_symbol})`, text: shareMessage });
      } else {
        await copyShare();
      }
    } catch {
      return;
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <main className="app-page-shell">
          <div className="app-shell-container py-10">
            <div className="text-sm text-muted-foreground">Loading token details…</div>
          </div>
        </main>
      </PageLayout>
    );
  }

  if (!launch) {
    return (
      <PageLayout>
        <main className="app-page-shell">
          <div className="app-shell-container py-10 space-y-4">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <Card className="app-panel rounded-2xl">
              <CardHeader>
                <CardTitle>Token not found</CardTitle>
                <CardDescription>This launch record is unavailable right now.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </PageLayout>
    );
  }

  const network = (launch.network as SolanaNetwork) || "mainnet";

  return (
    <PageLayout>
      <SEOHead title={`${launch.token_name} | My Token`} description={`View ${launch.token_name} launch details, progress, liquidity, and sharing options.`} />
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6 py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="app-panel rounded-2xl">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    {launch.logo_url ? (
                      <img src={launch.logo_url} alt={`${launch.token_symbol} logo`} className="h-20 w-20 rounded-2xl border border-border object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted text-2xl font-semibold">
                        {launch.token_symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div>
                        <CardTitle className="text-3xl">{launch.token_name}</CardTitle>
                        <CardDescription className="mt-1">${launch.token_symbol} • {network === "mainnet" ? "Mainnet" : "Devnet"}</CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Supply {Number(launch.total_supply).toLocaleString()}</Badge>
                        <Badge variant="outline">Decimals {launch.decimals}</Badge>
                        <Badge variant="outline">Created {new Date(launch.created_at).toLocaleDateString()}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={copyAddress}><Copy className="h-4 w-4" />Copy address</Button>
                    <Button variant="outline" onClick={copyShare}><Megaphone className="h-4 w-4" />Copy post</Button>
                    <Button onClick={shareNow}><Share2 className="h-4 w-4" />Share</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Token address</div>
                    <div className="mt-2 break-all font-mono text-xs">{launch.mint_address}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Liquidity</div>
                    <div className="mt-2 text-sm font-semibold">
                      {launch.liquidity_added
                        ? `${Number(launch.base_amount_sol ?? 0).toLocaleString()} SOL + ${Number(launch.quote_amount_tokens ?? 0).toLocaleString()} ${launch.token_symbol}`
                        : "Pending"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pool</div>
                    <div className="mt-2 break-all font-mono text-xs">{launch.pool_address || "Not created yet"}</div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Trust signal</div>
                    <div className="mt-2 text-sm font-semibold">
                      {launch.liquidity_locked ? `LP locked until ${launch.lock_unlock_at ? new Date(launch.lock_unlock_at).toLocaleDateString() : "scheduled"}` : "LP lock pending"}
                    </div>
                  </div>
                </div>

                {launch.description ? (
                  <div className="rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
                    {launch.description}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={explorerUrl(network, launch.mint_address, "address")} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Solscan
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={buildAlphaMemeSniperUrl(launch.mint_address)} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> AlphaMemeSniper
                    </a>
                  </Button>
                  {launch.pool_address ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={dexscreenerUrl(network, launch.mint_address)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Dexscreener
                      </a>
                    </Button>
                  ) : null}
                  {launch.lock_address ? (
                    <Button asChild variant="outline" size="sm">
                      <a href={streamflowExplorerUrl(network, launch.lock_address)} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Streamflow
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Launch progress</CardTitle>
                  <CardDescription>Resume any incomplete step directly from here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {phaseItems(launch).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
                      <span>{item.label}</span>
                      <span className={item.done ? "text-primary" : "text-muted-foreground"}>{item.done ? "Done" : "Pending"}</span>
                    </div>
                  ))}
                  <Button asChild className="w-full">
                    <Link to={`/launch-token?launchId=${encodeURIComponent(launch.id)}&step=${getLaunchResumeStep(launch)}`}>
                      <Rocket className="h-4 w-4" /> {getLaunchNextActionLabel(launch)}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Ready-to-share post</CardTitle>
                  <CardDescription>Use this message immediately after launch.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-border bg-card/70 p-4">
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">{shareMessage}</pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}