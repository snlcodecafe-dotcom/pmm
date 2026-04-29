import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Droplets, ExternalLink, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { verifyMetadataOnChain, type SolanaNetwork } from "@/lib/tokenLauncher";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";

const PROVIDERS = [
  { id: "raydium", name: "Raydium", url: "https://raydium.io/liquidity/create-pool/", desc: "Largest Solana AMM. Best discoverability on Jupiter / DexScreener." },
  { id: "meteora", name: "Meteora DLMM", url: "https://app.meteora.ag/dlmm", desc: "Concentrated liquidity, lower capital required to bootstrap." },
  { id: "orca", name: "Orca Whirlpools", url: "https://www.orca.so/pools", desc: "Concentrated liquidity, audited UI." },
];

// P3-4: preset liquidity templates
const PRESETS = [
  { id: "conservative", label: "Conservative", sol: "0.5", tokens: "1000000", note: "Cheap to spin up, low slippage protection. Good for ultra-tiny launches." },
  { id: "balanced", label: "Balanced", sol: "1.0", tokens: "5000000", note: "Recommended minimum for DexScreener/Jupiter auto-indexing." },
  { id: "degen", label: "Degen", sol: "5.0", tokens: "20000000", note: "Strong day-1 depth. Reduces slippage for large early buys." },
];

const network: SolanaNetwork = "mainnet";

export default function TokenLiquidityPool() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const mint = search.get("mint") || "";
  const { wallet } = useSolanaWallet();

  const [baseSol, setBaseSol] = useState("1");
  const [quoteTokens, setQuoteTokens] = useState("1000000");
  const [provider, setProvider] = useState("raydium");
  const [poolAddress, setPoolAddress] = useState("");
  const [saving, setSaving] = useState(false);

  // P0-1: gate on metadata existence
  const [metaCheck, setMetaCheck] = useState<{ loading: boolean; ok: boolean | null }>({ loading: false, ok: null });

  useEffect(() => {
    if (!mint) return;
    (async () => {
      const { data } = await supabase
        .from("token_launches")
        .select("base_amount_sol,quote_amount_tokens,pool_address,amm_type")
        .eq("mint_address", mint)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        if (data.base_amount_sol) setBaseSol(String(data.base_amount_sol));
        if (data.quote_amount_tokens) setQuoteTokens(String(data.quote_amount_tokens));
        if (data.pool_address) setPoolAddress(data.pool_address);
        if (data.amm_type) setProvider(data.amm_type);
      }
    })();
  }, [mint]);

  // P0-1: verify metadata exists on-chain before allowing LP work to be marked complete.
  useEffect(() => {
    if (!mint || !wallet.publicKey) return;
    setMetaCheck({ loading: true, ok: null });
    void verifyMetadataOnChain({ network, walletPubkey: wallet.publicKey, mintAddress: mint })
      .then((v) => setMetaCheck({ loading: false, ok: v.exists }))
      .catch(() => setMetaCheck({ loading: false, ok: null }));
  }, [mint, wallet.publicKey]);

  const recordPool = async () => {
    if (!mint || !poolAddress) { toast.error("Mint and pool address required"); return; }
    if (metaCheck.ok === false) {
      toast.error("Add Metaplex metadata before recording liquidity — wallets won't show your token otherwise.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("token_launches").update({
        pool_address: poolAddress,
        amm_type: provider,
        base_amount_sol: parseFloat(baseSol) || null,
        quote_amount_tokens: parseFloat(quoteTokens) || null,
        liquidity_added: true,
      }).eq("mint_address", mint);
      if (error) throw error;
      toast.success("Pool recorded. Re-running audit…");
      // P0-2: redirect to Audit so the user closes the loop.
      navigate(`/audit-token/${mint}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = useMemo(() => ([
    { label: "Token Tools", to: "/audit-token" },
    { label: "Liquidity Pool" },
  ]), []);

  return (
    <PageLayout showCTABanner={false}>
      <SEOHead
        title="Create Liquidity Pool — Raydium, Meteora & Orca"
        description="Open a liquidity pool for your Solana token on Raydium, Meteora DLMM or Orca Whirlpools and unlock Jupiter / DexScreener discovery."
        canonical="/token-tools/liquidity"
        keywords="raydium liquidity pool, meteora dlmm, orca whirlpools, solana liquidity, lp solana token"
        schema={[
          productSchema({
            name: "Solana Liquidity Pool Tool",
            description: "Plan, open and record liquidity pools on Raydium, Meteora and Orca for your SPL token.",
            url: "https://promotemymemes.com/token-tools/liquidity",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Token Tools", url: "/audit-token" },
            { name: "Liquidity Pool", url: "/token-tools/liquidity" },
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
            <Badge variant="secondary" className="gap-1.5"><Droplets className="h-3 w-3" /> Liquidity Tool</Badge>
          </div>

          {/* P0-1: sequence warning */}
          {mint && metaCheck.ok === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Metadata missing — fix this first</AlertTitle>
              <AlertDescription className="text-xs">
                We could not find a Metaplex metadata account for this mint on-chain. If you open a pool now, traders
                will see "Unknown Token" on every DEX and wallet. <Link to={`/token-tools/metadata?mint=${mint}`} className="underline">Attach metadata first →</Link>
              </AlertDescription>
            </Alert>
          )}
          {mint && metaCheck.ok === true && (
            <Alert className="border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertTitle className="text-emerald-500">Metadata verified on-chain</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground">Safe to add liquidity — wallets and DEXs will display your name, symbol and logo.</AlertDescription>
            </Alert>
          )}

          <Card className="app-hero">
            <CardHeader>
              <CardTitle className="text-2xl">Create Liquidity Pool</CardTitle>
              <CardDescription>
                Add SOL/Token liquidity so traders can buy your token. Aim for at least <strong>1 SOL</strong> to be visible on DexScreener and Jupiter aggregators.
                {mint && <> Mint: <code className="text-xs">{mint.slice(0, 8)}…{mint.slice(-6)}</code></>}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* P3-4: preset templates */}
          <Card className="app-panel">
            <CardHeader><CardTitle className="text-lg">Quick presets</CardTitle><CardDescription>Pick a starting point — you can override the numbers below.</CardDescription></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setBaseSol(p.sol); setQuoteTokens(p.tokens); toast.success(`${p.label} preset applied`); }}
                  className="text-left rounded-xl border border-border bg-background/40 p-4 transition hover:border-primary/50 hover:bg-accent/10"
                >
                  <div className="font-semibold">{p.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{p.sol} SOL · {Number(p.tokens).toLocaleString()} tokens</div>
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{p.note}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="app-panel">
            <CardHeader><CardTitle className="text-lg">1. Choose an AMM</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProvider(p.id)}
                  className={`text-left rounded-xl border p-4 transition ${provider === p.id ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-accent/10"}`}
                >
                  <div className="font-semibold">{p.name}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="app-panel">
            <CardHeader><CardTitle className="text-lg">2. Plan your initial liquidity</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Base liquidity (SOL)</Label>
                <Input type="number" step="0.1" value={baseSol} onChange={(e) => setBaseSol(e.target.value)} />
                <p className="text-xs text-muted-foreground">Recommended ≥ 1 SOL for indexer visibility.</p>
              </div>
              <div className="space-y-2">
                <Label>Token amount paired</Label>
                <Input type="number" value={quoteTokens} onChange={(e) => setQuoteTokens(e.target.value)} />
                <p className="text-xs text-muted-foreground">Initial price = SOL ÷ Tokens.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="app-panel">
            <CardHeader>
              <CardTitle className="text-lg">3. Create the pool on {PROVIDERS.find(p => p.id === provider)?.name}</CardTitle>
              <CardDescription>Open the AMM in a new tab, paste your mint address, and confirm the deposit transaction with your wallet.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <a href={PROVIDERS.find(p => p.id === provider)!.url} target="_blank" rel="noreferrer">
                  Open {PROVIDERS.find(p => p.id === provider)?.name} <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              {mint && (
                <Button variant="outline" className="rounded-full" onClick={() => { navigator.clipboard.writeText(mint); toast.success("Mint copied"); }}>
                  Copy mint address
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="app-panel">
            <CardHeader>
              <CardTitle className="text-lg">4. Record the pool address</CardTitle>
              <CardDescription>Paste the pool/AMM address returned by the AMM so we can verify on the next audit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Pool address" value={poolAddress} onChange={(e) => setPoolAddress(e.target.value)} />
              <Button onClick={recordPool} disabled={saving || !poolAddress || metaCheck.ok === false} className="rounded-full px-5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save pool & re-audit
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
