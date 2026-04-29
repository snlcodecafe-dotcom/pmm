import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Upload, ExternalLink, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { attachMetadataToExistingMint, explorerUrl, verifyMetadataOnChain, type SolanaNetwork } from "@/lib/tokenLauncher";

export default function TokenMetadataUpload() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const mint = search.get("mint") || "";

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [metadataUri, setMetadataUri] = useState<string>("");
  const [attaching, setAttaching] = useState(false);
  const [attachSig, setAttachSig] = useState<string>("");
  const [network] = useState<SolanaNetwork>("mainnet");
  const { wallet, connect, signTransaction } = useSolanaWallet();

  const handleAttach = async () => {
    if (!mint) { toast.error("Mint address missing"); return; }
    if (!metadataUri) { toast.error("Pin metadata to IPFS first"); return; }
    if (!wallet.connected || !wallet.publicKey) {
      try { await connect(); } catch { toast.error("Connect your wallet to sign the on-chain transaction"); return; }
    }
    const pubkey = wallet.publicKey ?? (window as { solana?: { publicKey?: { toBase58?: () => string } } }).solana?.publicKey?.toBase58?.();
    if (!pubkey) { toast.error("Wallet not connected"); return; }
    setAttaching(true);
    try {
      const { signature } = await attachMetadataToExistingMint({
        network, walletPubkey: pubkey, mintAddress: mint,
        name, symbol, uri: metadataUri,
        signTransaction: signTransaction as any,
      });
      setAttachSig(signature);
      await supabase.from("token_launches").update({
        metadata_attached: true, metadata_tx_signature: signature,
      }).eq("mint_address", mint);

      // P0-4: re-verify on-chain BEFORE showing the green success state.
      toast.message("Verifying on-chain…");
      // Solana RPC needs a beat to propagate the new account.
      await new Promise((r) => setTimeout(r, 4000));
      const v = await verifyMetadataOnChain({ network, walletPubkey: pubkey, mintAddress: mint });
      if (!v.exists) {
        toast.error("Tx confirmed but metadata account is not yet visible. Re-run the audit in ~30s.");
        return;
      }
      toast.success("Metadata attached & verified on-chain ✓ Returning to audit…");
      // P0-2: close the loop — send the user back to the audit page.
      setTimeout(() => navigate(`/audit-token/${mint}`), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg)) {
        toast.error("A metadata account already exists for this mint.");
      } else if (/Signature verification|mint authority|0x/i.test(msg)) {
        toast.error("Attach failed — your connected wallet must currently hold the MINT AUTHORITY for this token.");
      } else {
        toast.error(msg);
      }
    } finally {
      setAttaching(false);
    }
  };

  useEffect(() => {
    if (!mint) return;
    (async () => {
      const { data } = await supabase
        .from("token_launches")
        .select("token_name,token_symbol,description,website,twitter,telegram,logo_url,metadata_uri")
        .eq("mint_address", mint)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setName(data.token_name || "");
        setSymbol(data.token_symbol || "");
        setDescription(data.description || "");
        setWebsite(data.website || "");
        setTwitter(data.twitter || "");
        setTelegram(data.telegram || "");
        setLogoUrl(data.logo_url || "");
        setMetadataUri(data.metadata_uri || "");
      }
    })();
  }, [mint]);

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${mint || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("token-logos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("token-logos").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePin = async () => {
    if (!name || !symbol || !logoUrl) {
      toast.error("Name, symbol and logo are required");
      return;
    }
    setPinning(true);
    try {
      const { data, error } = await supabase.functions.invoke("pin-metadata", {
        body: {
          name, symbol, description, image: logoUrl,
          external_url: website || undefined,
          extensions: { website, twitter, telegram },
        },
      });
      if (error) throw error;
      const uri = (data as any)?.uri || (data as any)?.metadataUri;
      if (!uri) throw new Error("No metadata URI returned");
      setMetadataUri(uri);

      if (mint) {
        await supabase.from("token_launches").update({
          token_name: name, token_symbol: symbol, description,
          website, twitter, telegram, logo_url: logoUrl, metadata_uri: uri,
        }).eq("mint_address", mint);
      }
      toast.success("Metadata pinned to IPFS");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pin metadata");
    } finally {
      setPinning(false);
    }
  };

  return (
    <PageLayout showCTABanner={false}>
      <SEOHead
        title="Attach Metaplex Metadata — Pin to IPFS & Link On-Chain"
        description="Pin your token JSON to IPFS and attach Metaplex metadata on-chain in one click so DEXs and wallets show your name, symbol and logo."
        canonical="/token-tools/metadata"
        keywords="metaplex metadata, attach metadata solana, pin to ipfs, token logo dexscreener"
        schema={[
          productSchema({
            name: "Solana Metaplex Metadata Tool",
            description: "Pin token metadata JSON to IPFS and attach a Metaplex metadata account on-chain in one signed transaction.",
            url: "https://promotemymemes.com/token-tools/metadata",
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Token Tools", url: "/audit-token" },
            { name: "Metadata", url: "/token-tools/metadata" },
          ]),
        ]}
      />
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6">
          <Breadcrumbs items={[{ label: "Token Tools", to: "/audit-token" }, { label: "Metadata" }]} />
          <div className="flex items-center justify-between">
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to={mint ? `/audit-token/${mint}` : "/audit-token"}>
                <ArrowLeft className="h-4 w-4" /> Back to audit
              </Link>
            </Button>
            <Badge variant="secondary" className="gap-1.5"><FileText className="h-3 w-3" /> Metadata Tool</Badge>
          </div>

          <Card className="app-hero">
            <CardHeader>
              <CardTitle className="text-2xl">Upload Token Metadata</CardTitle>
              <CardDescription>
                Two-step process for {mint ? <code className="text-xs">{mint.slice(0, 8)}…{mint.slice(-6)}</code> : "your token"}:
                <span className="mt-1 block"><strong>1.</strong> Pin a Metaplex-compatible JSON (name, symbol, image, socials) to IPFS.</span>
                <span className="block"><strong>2.</strong> Attach that URI to your mint on-chain so wallets and DEXs can read it. Step 2 requires the wallet that holds the mint authority.</span>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="app-panel">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Token" />
              </div>
              <div className="space-y-2">
                <Label>Symbol *</Label>
                <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="MYT" maxLength={10} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Twitter / X</Label>
                <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/..." />
              </div>
              <div className="space-y-2">
                <Label>Telegram</Label>
                <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/..." />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Logo *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setLogoFile(f); void handleLogoUpload(f); }
                    }}
                    disabled={uploading}
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                {logoUrl && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-2">
                    <img src={logoUrl} alt="logo" className="h-12 w-12 rounded object-cover" />
                    <a href={logoUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline truncate">{logoUrl}</a>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button onClick={handlePin} disabled={pinning || !name || !symbol || !logoUrl} className="rounded-full px-5">
                  {pinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Pin metadata to IPFS
                </Button>
                {metadataUri && (
                  <div className="flex items-center gap-2 text-sm text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Metadata URI ready
                  </div>
                )}
              </div>

              {metadataUri && (
                <div className="md:col-span-2 space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Step 1 complete · Metadata URI</div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-background/60 px-2 py-1.5 text-xs">{metadataUri}</code>
                    <Button asChild variant="outline" size="sm">
                      <a href={metadataUri} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>

                  <Alert className="border-amber-500/40 bg-amber-500/5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-500">Pinning alone is not enough</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      The IPFS link above is just a JSON file in storage. Wallets and DEXs only show your token's name,
                      symbol and logo once a <strong>Metaplex metadata account</strong> is created on-chain and points
                      to this URI. That requires a transaction signed by the wallet that currently holds the
                      <strong> mint authority</strong>.
                    </AlertDescription>
                  </Alert>

                  {mint && (
                    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step 2 · Attach on-chain</div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted-foreground">
                          Connected wallet: {wallet.publicKey ? <code className="text-foreground">{wallet.publicKey.slice(0,4)}…{wallet.publicKey.slice(-4)}</code> : <span className="text-amber-500">not connected</span>}
                        </div>
                        <Button onClick={handleAttach} disabled={attaching || !metadataUri} className="rounded-full">
                          {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                          {wallet.connected ? "Attach metadata to token" : "Connect wallet & attach"}
                        </Button>
                      </div>
                      {attachSig && (
                        <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span>Attached on-chain.</span>
                          <a href={explorerUrl(network, attachSig, "tx")} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-emerald-500 underline">
                            View tx <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        After the transaction confirms, return to the <Link to={`/audit-token/${mint}`} className="underline">audit page</Link> and re-run.
                        If you've already revoked mint authority you cannot attach metadata for the first time — you'll need to do it from the wallet that originally held it, or relaunch.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
