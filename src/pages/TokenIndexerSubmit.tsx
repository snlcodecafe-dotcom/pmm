import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, ExternalLink, Loader2, Radar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import PageLayout from "@/components/PageLayout";
import SEOHead, { productSchema, breadcrumbSchema } from "@/components/SEOHead";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const INDEXERS = [
  { id: "jupiter", name: "Jupiter", desc: "Solana's largest swap aggregator. Auto-indexes tokens with active Raydium / Meteora / Orca pools and ≥ $1k volume.", submit: "https://catdetlist.jup.ag/", docs: "https://station.jup.ag/guides/general/get-your-token-on-jupiter" },
  { id: "dexscreener", name: "DexScreener", desc: "Auto-discovers any pool with > $1k liquidity. Use 'Enhanced Token Info' to add socials & logo.", submit: "https://marketplace.dexscreener.com/product/token-info", docs: "https://docs.dexscreener.com/api/reference" },
  { id: "birdeye", name: "Birdeye", desc: "Real-time token analytics. Auto-indexes after first swap on a known DEX.", submit: "https://birdeye.so/find-gems", docs: "https://docs.birdeye.so/" },
  { id: "coingecko", name: "CoinGecko", desc: "Manual application. Requires active liquidity, social presence, and clean metadata.", submit: "https://support.coingecko.com/hc/en-us/requests/new", docs: "https://www.coingecko.com/en/methodology" },
];

interface IndexerStatus { jupiter?: boolean; dexscreener?: boolean }

export default function TokenIndexerSubmit() {
  const [search] = useSearchParams();
  const mint = search.get("mint") || "";
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<IndexerStatus>({});
  const [mintInput, setMintInput] = useState(mint);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [hasLp, setHasLp] = useState<boolean | null>(null);

  // P3-3: alert opt-in
  const [alertContact, setAlertContact] = useState("");
  const [savingAlert, setSavingAlert] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => { setMintInput(mint); }, [mint]);

  // P0-1: check whether liquidity has been recorded — submitting without LP is a dead end.
  useEffect(() => {
    if (!mint) { setHasLp(null); return; }
    (async () => {
      const { data } = await supabase
        .from("token_launches")
        .select("pool_address,liquidity_added,indexing_alert_contact")
        .eq("mint_address", mint)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setHasLp(!!(data?.pool_address || data?.liquidity_added));
      if (data?.indexing_alert_contact) setAlertContact(data.indexing_alert_contact);
    })();
  }, [mint]);

  const recheck = async (silent = false) => {
    const target = (mintInput || mint).trim();
    if (!target) { if (!silent) toast.error("Mint required"); return; }
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-indexing", {
        body: { mint: target },
      });
      if (error) throw error;
      const next: IndexerStatus = {
        jupiter: !!(data as { jupiter?: boolean })?.jupiter,
        dexscreener: !!(data as { dexscreener?: boolean })?.dexscreener,
      };
      setStatus(next);
      setLastChecked(new Date());
      if (!silent) toast.success("Indexing status refreshed");
      if (next.jupiter && next.dexscreener) setAutoRefresh(false);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "Check failed");
    } finally {
      setChecking(false);
    }
  };

  // P2-2: real-time auto-refresh while user waits for indexing
  useEffect(() => {
    if (!autoRefresh) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = window.setInterval(() => { void recheck(true); }, 30_000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const saveAlert = async () => {
    if (!mint) { toast.error("Open this page from your audit to attach an alert"); return; }
    if (!alertContact.trim()) { toast.error("Enter an email or @telegram handle"); return; }
    setSavingAlert(true);
    try {
      const { error } = await supabase
        .from("token_launches")
        .update({ indexing_alert_contact: alertContact.trim(), indexing_alert_sent: false })
        .eq("mint_address", mint);
      if (error) throw error;
      toast.success("Alert saved. We'll ping you when DexScreener / Jupiter pick up your token.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingAlert(false);
    }
  };

  const breadcrumbs = useMemo(() => ([
    { label: "Token Tools", to: "/audit-token" },
    { label: "Submit to Indexers" },
  ]), []);

  return (
    <PageLayout showCTABanner={false}>
      <SEOHead
        title="Submit Token to Indexers — Jupiter, DexScreener & Birdeye"
        description="One-click submission paths to Jupiter, DexScreener, Birdeye and other Solana indexers so your token appears in swap UIs and charts."
        canonical="/token-tools/indexers"
        keywords="submit to jupiter, dexscreener listing, birdeye token submit, solana indexer"
        schema={[
          productSchema({
            name: "Solana Indexer Submission Tool",
            description: "Submit your Solana token to Jupiter, DexScreener, Birdeye and CoinGecko in one place with live status polling.",
            url: "https://promotemymemes.com/token-tools/indexers",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Token Tools", url: "/audit-token" },
            { name: "Submit to Indexers", url: "/token-tools/indexers" },
          ]),
        ]}
      />
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to={mint ? `/audit-token/${mint}` : "/audit-token"}>
                <ArrowLeft className="h-4 w-4" /> Back to audit
              </Link>
            </Button>
            <Badge variant="secondary" className="gap-1.5"><Radar className="h-3 w-3" /> Indexer Tool</Badge>
          </div>

          {/* P0-1: sequence guard */}
          {mint && hasLp === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No liquidity pool found</AlertTitle>
              <AlertDescription className="text-xs">
                Indexers like Jupiter and DexScreener will not list a token without an active SOL/Token pool.
                <Link to={`/token-tools/liquidity?mint=${mint}`} className="ml-1 underline">Add liquidity first →</Link>
              </AlertDescription>
            </Alert>
          )}

          <Card className="app-hero">
            <CardHeader>
              <CardTitle className="text-2xl">Submit to Token Indexers</CardTitle>
              <CardDescription>
                Get listed on Jupiter, DexScreener, Birdeye and CoinGecko so traders can discover your token.
                Most indexers auto-pick tokens with ≥ 1 SOL liquidity within minutes — others require manual submission.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="app-panel">
            <CardHeader>
              <CardTitle className="text-lg">Live indexing status</CardTitle>
              <CardDescription>Check or watch indexers in real-time. Status auto-refreshes every 30s when watch mode is on.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={mintInput} onChange={(e) => setMintInput(e.target.value)} placeholder="Paste mint address" />
                <Button onClick={() => recheck(false)} disabled={checking} className="rounded-full px-5">
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                  Check now
                </Button>
                <Button
                  type="button"
                  variant={autoRefresh ? "default" : "outline"}
                  onClick={() => setAutoRefresh((v) => !v)}
                  className="rounded-full"
                  disabled={!(mintInput || mint).trim()}
                >
                  {autoRefresh ? "Watching…" : "Watch (auto)"}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                  <span>Jupiter</span>
                  <Badge variant={status.jupiter ? "default" : "outline"}>
                    {status.jupiter ? <><CheckCircle2 className="mr-1 h-3 w-3" /> Indexed</> : "Not indexed"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm">
                  <span>DexScreener</span>
                  <Badge variant={status.dexscreener ? "default" : "outline"}>
                    {status.dexscreener ? <><CheckCircle2 className="mr-1 h-3 w-3" /> Indexed</> : "Not indexed"}
                  </Badge>
                </div>
              </div>
              {lastChecked && (
                <p className="text-[11px] text-muted-foreground">Last checked {lastChecked.toLocaleTimeString()}{autoRefresh ? " · refreshing every 30s" : ""}</p>
              )}
            </CardContent>
          </Card>

          {/* P3-3: alert opt-in */}
          {mint && (
            <Card className="app-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-4 w-4" /> Get notified when indexed</CardTitle>
                <CardDescription>Drop an email or Telegram handle and we'll ping you the moment DexScreener / Jupiter list this token.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Label htmlFor="alert-contact" className="sr-only">Contact</Label>
                  <Input id="alert-contact" placeholder="you@example.com or @yourtg" value={alertContact} onChange={(e) => setAlertContact(e.target.value)} />
                  <Button onClick={saveAlert} disabled={savingAlert || !alertContact.trim()} className="rounded-full">
                    {savingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Save alert
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Alert is sent once per indexing event and you can change/clear it any time.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {INDEXERS.map((ix) => (
              <Card key={ix.id} className="app-panel">
                <CardHeader>
                  <CardTitle className="text-base">{ix.name}</CardTitle>
                  <CardDescription>{ix.desc}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-full">
                    <a href={ix.submit} target="_blank" rel="noreferrer">
                      Submit <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={ix.docs} target="_blank" rel="noreferrer">
                      Docs <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
