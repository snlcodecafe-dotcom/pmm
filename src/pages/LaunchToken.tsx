import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, ExternalLink, Rocket, AlertTriangle, CheckCircle2, XCircle, Lock, Search, Megaphone, Droplets, Copy, Share2, ShieldCheck, RefreshCw } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { LaunchProgress, type LaunchPhase } from "@/components/LaunchProgress";
import { CostEstimator } from "@/components/CostEstimator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { supabase } from "@/integrations/supabase/client";
import { buildLaunchShareMessage } from "@/lib/launchProgress";
import { createTokenWithMetadata, explorerUrl, verifyMetadataOnChain, getMintAuthorityStatus, getIndexingStatus, revokeAuthorities, type SolanaNetwork, type MetadataVerification, type IndexingStatus } from "@/lib/tokenLauncher";
import { AMM_OPTIONS, createRaydiumCpmmPool, estimateRaydiumCpmmSolNeeded, RAYDIUM_CPMM_BUFFER_SOL, type AmmType, dexscreenerUrl } from "@/lib/liquidityProvider";
import { lockLpWithStreamflow, streamflowExplorerUrl } from "@/lib/lpLocker";

const tokenSchema = z.object({
  name: z.string().trim().min(2).max(32),
  symbol: z.string().trim().regex(/^[A-Z0-9]{2,10}$/, "2-10 uppercase letters/numbers"),
  decimals: z.number().int().min(0).max(9),
  totalSupply: z.number().positive().max(1e15),
  description: z.string().max(500).optional(),
});

const brandingSchema = z.object({
  website: z.string().url().or(z.literal("")).optional(),
  twitter: z.string().url().or(z.literal("")).optional(),
  telegram: z.string().url().or(z.literal("")).optional(),
});

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export default function LaunchToken() {
  const { isAdmin } = useAuth();
  const { wallet, connect, signTransaction, signAllTransactions } = useSolanaWallet();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(0);
  const [network, setNetwork] = useState<SolanaNetwork>("mainnet");

  // Token details
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(9);
  const [totalSupply, setTotalSupply] = useState<number>(1_000_000_000);
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Metadata verification (post-create gate)
  const [verification, setVerification] = useState<MetadataVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Authority lock (final safety step)
  const [authorityStatus, setAuthorityStatus] = useState<{ mintAuthorityNull: boolean; freezeAuthorityNull: boolean } | null>(null);
  const [authorityModalOpen, setAuthorityModalOpen] = useState(false);
  const [confirmRevokeMint, setConfirmRevokeMint] = useState(true);
  const [confirmRevokeFreeze, setConfirmRevokeFreeze] = useState(true);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);

  // Indexing live status
  const [indexing, setIndexing] = useState<IndexingStatus | null>(null);
  const [indexingChecking, setIndexingChecking] = useState(false);

  // Liquidity
  const [ammChoice, setAmmChoice] = useState<AmmType>("raydium-cpmm");
  const [lpTokenAmount, setLpTokenAmount] = useState<number>(500_000_000);
  const [lpSolAmount, setLpSolAmount] = useState<number>(0.5);

  // Lock
  const [doLock, setDoLock] = useState(true);
  const [lockDays, setLockDays] = useState<number>(30);

  // Auto-promo
  const [autoPromo, setAutoPromo] = useState(true);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");

  const [result, setResult] = useState<{
    launchId?: string;
    mint?: string;
    signature?: string;
    metadataUri?: string;
    poolId?: string;
    lpMint?: string;
    poolSig?: string;
    lockId?: string;
    unlockAt?: string;
  } | null>(null);

  const estimatedLiquidityTotalSol = useMemo(
    () => estimateRaydiumCpmmSolNeeded(Number.isFinite(lpSolAmount) ? lpSolAmount : 0),
    [lpSolAmount],
  );

  const launchShareMessage = useMemo(() => {
    if (!result?.mint) return "";
    return buildLaunchShareMessage({
      name: name || "New Token",
      symbol: symbol || "TOKEN",
      mint: result.mint,
      totalSupply,
      liquiditySummary: result.poolId ? `${lpSolAmount.toLocaleString()} SOL + ${lpTokenAmount.toLocaleString()} ${symbol || "tokens"}` : "Launching now",
      lockSummary: result.lockId ? `Enabled until ${result.unlockAt ? new Date(result.unlockAt).toLocaleDateString() : "scheduled"}` : "Not locked yet",
      website,
      twitter,
      telegram,
      network,
    }) + (result.poolId ? `\nDexscreener: ${dexscreenerUrl(network, result.mint)}` : "");
  }, [result, name, symbol, totalSupply, lpSolAmount, lpTokenAmount, website, twitter, telegram, network]);

  const copyLaunchMessage = async () => {
    if (!launchShareMessage) return;
    try {
      await navigator.clipboard.writeText(launchShareMessage);
      toast.success("Launch message copied");
    } catch {
      toast.error("Could not copy launch message");
    }
  };

  const shareLaunchMessage = async () => {
    if (!launchShareMessage) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name || "Token launch"} ${symbol ? `(${symbol})` : ""}`.trim(),
          text: launchShareMessage,
        });
      } else {
        await copyLaunchMessage();
      }
    } catch {
      // user cancelled share — no toast needed
    }
  };

  useEffect(() => {
    if (!logoFile) { setLogoPreview(null); return; }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!isAdmin && network !== "mainnet") setNetwork("mainnet");
  }, [isAdmin, network]);

  useEffect(() => {
    const launchId = searchParams.get("launchId");
    const mintParam = searchParams.get("mint");
    const stepParam = searchParams.get("step");
    if (!launchId && !mintParam) return;

    const loadLaunch = async () => {
      const query = supabase.from("token_launches").select("*");
      const { data } = launchId
        ? await query.eq("id", launchId).maybeSingle()
        : await query.eq("mint_address", mintParam!).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!data) {
        // Mint not in our launches table — still allow jumping to the requested step with mint pre-filled
        if (mintParam) {
          setResult({ mint: mintParam } as any);
          const parsedStep = Number(stepParam);
          if (Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep <= 8) {
            setStep(parsedStep as Step);
          }
        }
        return;
      }

      setName(data.token_name ?? "");
      setSymbol(data.token_symbol ?? "");
      setDecimals(data.decimals ?? 9);
      setTotalSupply(Number(data.total_supply ?? 0));
      setDescription(data.description ?? "");
      setLogoPreview(data.logo_url ?? null);
      setWebsite(data.website ?? "");
      setTwitter(data.twitter ?? "");
      setTelegram(data.telegram ?? "");
      setNetwork((data.network as SolanaNetwork) ?? "mainnet");
      setLpSolAmount(Number(data.base_amount_sol ?? 0.5));
      setLpTokenAmount(Number(data.quote_amount_tokens ?? 500_000_000));
      setResult({
        launchId: data.id,
        mint: data.mint_address,
        metadataUri: data.metadata_uri ?? undefined,
        poolId: data.pool_address ?? undefined,
        lpMint: data.lp_mint ?? undefined,
        lockId: data.lock_address ?? undefined,
        unlockAt: data.lock_unlock_at ?? undefined,
      });

      const parsedStep = Number(stepParam);
      if (Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep <= 8) {
        setStep(parsedStep as Step);
      }
    };

    void loadLaunch();
  }, [searchParams]);

  const phaseStatus = (done: boolean, current: boolean): LaunchPhase["status"] =>
    done ? "done" : current && busy ? "active" : "pending";

  const phases: LaunchPhase[] = useMemo(() => {
    const r = result || {};
    const authorityRevoked = !!authorityStatus?.mintAuthorityNull && !!authorityStatus?.freezeAuthorityNull;
    const indexed = !!indexing && indexing.state === "FULLY_INDEXED";
    return [
      { key: "token", label: "Create token + metadata", status: phaseStatus(!!r.mint, busyLabel === "creating") },
      { key: "verify", label: "Verify metadata on-chain", status: phaseStatus(!!verification?.ok, verifying) },
      { key: "lp", label: "Add liquidity", status: phaseStatus(!!r.poolId, busyLabel === "lp") },
      { key: "lock", label: "Lock LP", status: doLock ? phaseStatus(!!r.lockId, busyLabel === "lock") : "future" },
      { key: "authority", label: "Revoke mint & freeze authority", status: phaseStatus(authorityRevoked, busyLabel === "revoke") },
      { key: "index", label: "Index on Dexscreener / Jupiter", status: phaseStatus(indexed, indexingChecking) },
      { key: "promo", label: "Auto-start promotion", status: autoPromo ? "pending" : "future" },
    ];
  }, [result, busyLabel, busy, doLock, autoPromo, verification, verifying, authorityStatus, indexing, indexingChecking]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type)) {
      toast.error("Logo must be PNG, JPG, WEBP or GIF"); return;
    }
    if (f.size > 200 * 1024) { toast.error("Logo must be under 200KB"); return; }
    setLogoFile(f);
  };

  const validateStep1 = () => {
    const r = tokenSchema.safeParse({ name, symbol, decimals, totalSupply, description });
    if (!r.success) { toast.error(r.error.errors[0]?.message || "Invalid token details"); return false; }
    return true;
  };
  const validateStep2 = () => {
    if (!logoFile) { toast.error("Please upload a logo"); return false; }
    const r = brandingSchema.safeParse({ website, twitter, telegram });
    if (!r.success) { toast.error("Invalid URL in branding"); return false; }
    return true;
  };

  // ─── Phase 1+2: create token ───────────────────────────────────────
  const handleCreateToken = async () => {
    // Gate behind login
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Please sign in to launch a token"); window.location.href = `/auth?next=${encodeURIComponent("/launch-token")}`; return; }
    if (!wallet.connected || !wallet.publicKey) { toast.error("Connect your wallet first"); return; }
    if (!acceptedTerms) { toast.error("Please accept the terms"); return; }
    if (!logoFile) { toast.error("Logo missing"); return; }

    setBusy(true);
    try {
      setBusyLabel("creating");

      const ext = logoFile.name.split(".").pop() || "png";
      const filePath = `${Date.now()}-${symbol.toLowerCase()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("token-logos")
        .upload(filePath, logoFile, { contentType: logoFile.type, upsert: false });
      if (upErr) throw new Error(`Logo upload failed: ${upErr.message}`);
      const { data: { publicUrl } } = supabase.storage.from("token-logos").getPublicUrl(filePath);

      const { data: pinData, error: pinErr } = await supabase.functions.invoke("pin-metadata", {
        body: {
          name, symbol, description: description || undefined, image: publicUrl,
          extensions: { website: website || undefined, twitter: twitter || undefined, telegram: telegram || undefined },
        },
      });
      if (pinErr || !pinData?.uri) throw new Error(`Metadata pin failed: ${pinErr?.message || pinData?.error}`);
      const metadataUri: string = pinData.uri;

      const { mintAddress, signature } = await createTokenWithMetadata({
        network, walletPubkey: wallet.publicKey, name, symbol, decimals, totalSupply, metadataUri,
        revokeMintAuthority: false, // authority revocation moved to dedicated safety step (step 6)
        signTransaction: signTransaction as any,
      });

      let launchId: string | undefined;
      const { data: recData, error: recError } = await supabase.functions.invoke("record-launch", {
        body: {
          wallet_address: wallet.publicKey, network, mint_address: mintAddress,
          token_name: name, token_symbol: symbol, decimals, total_supply: totalSupply,
          description: description || null, logo_url: publicUrl, metadata_uri: metadataUri,
          website: website || null, twitter: twitter || null, telegram: telegram || null,
          create_tx_signature: signature, metadata_tx_signature: signature,
        },
      });

      if (recError || !recData?.launch?.id) {
        // Fallback: persist directly using authenticated client so the user never loses progress
        console.warn("record-launch failed, falling back to direct insert:", recError, recData);
        const { data: directInsert, error: directErr } = await supabase
          .from("token_launches")
          .insert({
            user_id: session.user.id,
            wallet_address: wallet.publicKey,
            network,
            mint_address: mintAddress,
            token_name: name,
            token_symbol: symbol,
            decimals,
            total_supply: totalSupply,
            description: description || null,
            logo_url: publicUrl,
            metadata_uri: metadataUri,
            website: website || null,
            twitter: twitter || null,
            telegram: telegram || null,
            token_created: true,
            metadata_attached: !!metadataUri,
            create_tx_signature: signature,
            metadata_tx_signature: signature,
          })
          .select("id")
          .single();
        if (directErr || !directInsert?.id) {
          throw new Error(`Saved on-chain but failed to record launch: ${directErr?.message || recError?.message || "unknown error"}. Mint: ${mintAddress}`);
        }
        launchId = directInsert.id;
      } else {
        launchId = recData.launch.id;
      }

      setResult((r) => ({ ...(r || {}), launchId, mint: mintAddress, signature, metadataUri }));
      toast.success("Token created on-chain!");
      setStep(4); // move to liquidity step
    } catch (e: any) {
      console.error("Create error:", e);
      toast.error(e?.message || "Token creation failed");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  // ─── Phase 3: liquidity ────────────────────────────────────────────
  const handleAddLiquidity = async () => {
    if (!result?.mint || !result.launchId) { toast.error("No mint address found — please create your token first."); return; }
    if (!wallet.publicKey) { toast.error("Wallet not connected"); return; }
    let v = verification;
    if (!v?.ok) {
      v = await runMetadataVerification(true);
      if (!v?.ok) { toast.error(v?.errors?.[0] || "Metadata must pass verification before adding liquidity"); return; }
    }
    if (ammChoice !== "raydium-cpmm") {
      toast.error("Only Raydium CPMM is live in this iteration. AMM v4 + Meteora coming next.");
      return;
    }
    if (lpTokenAmount <= 0 || lpSolAmount <= 0) { toast.error("Amounts must be > 0"); return; }
    if (!Number.isFinite(lpTokenAmount) || !Number.isFinite(lpSolAmount)) { toast.error("Enter valid liquidity amounts"); return; }

    if (!signTransaction) {
      toast.error(`${wallet.walletName || "Your wallet"} is not ready to sign. Reconnect your wallet and try again.`);
      return;
    }

    setBusy(true); setBusyLabel("lp");
    try {
      const { poolId, lpMint, signature: poolSig } = await createRaydiumCpmmPool({
        network, walletPubkey: wallet.publicKey, tokenMint: result.mint,
        tokenDecimals: decimals, tokenAmount: lpTokenAmount, solAmount: lpSolAmount,
        signTransaction: (tx) => signTransaction(tx) as Promise<any>,
      });

      await supabase.functions.invoke("update-launch-phase", {
        body: {
          launch_id: result.launchId, wallet_address: wallet.publicKey,
          amm_type: ammChoice, pool_address: poolId, lp_mint: lpMint,
          base_amount_sol: lpSolAmount, quote_amount_tokens: lpTokenAmount,
          liquidity_added: true,
        },
      });

      setResult((r) => ({ ...(r || {}), poolId, lpMint, poolSig }));
      toast.success("Liquidity pool created!");
      setStep(5);
    } catch (e: any) {
      console.error("LP error:", e);
      toast.error(e?.message || "Pool creation failed. Check console.");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  // ─── Phase 4a: lock ────────────────────────────────────────────────
  const handleLockLp = async () => {
    if (!result?.lpMint || !result.launchId) { toast.error("Add liquidity first"); return; }
    if (!wallet.publicKey) { toast.error("Wallet not connected"); return; }
    setBusy(true); setBusyLabel("lock");
    try {
      const { streamId, unlockAt, signature } = await lockLpWithStreamflow({
        network, walletPubkey: wallet.publicKey, lpMint: result.lpMint,
        amount: 0.999, // lock ~all LP minus dust; user holds full LP balance from pool create
        durationDays: lockDays,
        signTransaction: signTransaction as any,
        signAllTransactions: signAllTransactions as any,
      });

      await supabase.functions.invoke("update-launch-phase", {
        body: {
          launch_id: result.launchId, wallet_address: wallet.publicKey,
          lock_provider: "streamflow", lock_address: streamId,
          lock_unlock_at: unlockAt, liquidity_locked: true,
        },
      });

      setResult((r) => ({ ...(r || {}), lockId: streamId, unlockAt }));
      toast.success(`LP locked for ${lockDays} days via Streamflow!`);
      setStep(6);
    } catch (e: any) {
      console.error("Lock error:", e);
      toast.error(e?.message || "Lock failed");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  // ─── Phase 4b/c: trigger indexing check + promo ────────────────────
  const handleFinalize = async () => {
    setBusy(true); setBusyLabel("index");
    try {
      await supabase.functions.invoke("check-indexing", { body: {} });
      toast.success("Indexing check started. Promotion will auto-launch once indexed.");
      setStep(8);
    } catch (e: any) {
      toast.error(e?.message || "Indexing check failed");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  // ─── Metadata verification engine ─────────────────────────────────
  const runMetadataVerification = async (silent = false) => {
    if (!result?.mint) {
      if (!silent) toast.error("No mint address yet — create the token first.");
      return null;
    }
    if (!wallet.publicKey) {
      if (!silent) toast.error("Connect your wallet to verify metadata.");
      return null;
    }
    setVerifying(true);
    try {
      const v = await verifyMetadataOnChain({ network, walletPubkey: wallet.publicKey, mintAddress: result.mint });
      setVerification(v);
      if (!silent) {
        if (v.ok) toast.success("Metadata verified ✓");
        else toast.error(v.errors[0] || "Metadata verification failed");
      }
      return v;
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Verification failed");
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // Auto-run verification once we land on step 4 with a mint AND wallet connected (silent — no misleading toasts)
  useEffect(() => {
    if (step === 4 && result?.mint && wallet.publicKey && !verification && !verifying) {
      void runMetadataVerification(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result?.mint, wallet.publicKey]);

  // ─── Authority status fetch ───────────────────────────────────────
  const refreshAuthorityStatus = async () => {
    if (!result?.mint) return null;
    try {
      const s = await getMintAuthorityStatus({ network, mintAddress: result.mint });
      setAuthorityStatus({ mintAuthorityNull: s.mintAuthorityNull, freezeAuthorityNull: s.freezeAuthorityNull });
      return s;
    } catch {
      return null;
    }
  };
  useEffect(() => {
    if ((step === 6 || step === 7) && result?.mint && !authorityStatus) void refreshAuthorityStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result?.mint]);

  // ─── Revoke mint + freeze authorities (final safety step) ─────────
  const handleRevokeAuthorities = async () => {
    if (!result?.mint) { toast.error("No mint found — create the token first."); return; }
    if (!wallet.publicKey) { toast.error("Connect your wallet first."); return; }
    if (!confirmIrreversible) { toast.error("Please confirm you understand this is irreversible"); return; }
    if (!confirmRevokeMint && !confirmRevokeFreeze) { toast.error("Select at least one authority to revoke"); return; }
    setBusy(true); setBusyLabel("revoke");
    try {
      await revokeAuthorities({
        network, walletPubkey: wallet.publicKey, mintAddress: result.mint,
        revokeMint: confirmRevokeMint, revokeFreeze: confirmRevokeFreeze,
        signTransaction: signTransaction as any,
      });
      // Ledger: record revoke fee per authority revoked
      try {
        const count = (confirmRevokeMint ? 1 : 0) + (confirmRevokeFreeze ? 1 : 0);
        const fee = 0.000005 * count + 0.000010; // signature fees
        await supabase.functions.invoke("record-tx-event", {
          body: {
            launch_id: result.launchId, wallet_address: wallet.publicKey,
            mint_address: result.mint, token_symbol: symbol,
            tx_type: "authority_revoke",
            amount_sol: fee,
            notes: `Revoked: ${[confirmRevokeMint && "mint", confirmRevokeFreeze && "freeze"].filter(Boolean).join(" + ")}`,
          },
        });
      } catch (e) { console.warn("ledger record (revoke) failed:", e); }
      toast.success("Authorities revoked ✓ Token is now locked.");
      setAuthorityModalOpen(false);
      await refreshAuthorityStatus();
      setStep(7);
    } catch (e: any) {
      console.error("Revoke error:", e);
      toast.error(e?.message || "Revoke failed");
    } finally {
      setBusy(false); setBusyLabel("");
    }
  };

  // ─── Live indexing check (single mint) ────────────────────────────
  const refreshIndexing = async () => {
    if (!result?.mint) return;
    setIndexingChecking(true);
    try {
      const s = await getIndexingStatus(result.mint);
      setIndexing(s);
    } finally {
      setIndexingChecking(false);
    }
  };
  useEffect(() => {
    if (step === 7 && result?.mint && !indexing) void refreshIndexing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result?.mint]);

  // ─── Readiness score (out of 100) ─────────────────────────────────
  const readiness = useMemo(() => {
    const metadataOk = !!verification?.ok;
    const liquidityOk = !!result?.poolId;
    const authorityLocked = !!authorityStatus?.mintAuthorityNull && !!authorityStatus?.freezeAuthorityNull;
    const indexedCount = (indexing?.dexscreener ? 1 : 0) + (indexing?.jupiter ? 1 : 0) + (indexing?.raydium ? 1 : 0);
    const indexingScore = indexing ? Math.round((indexedCount / 3) * 25) : 0;
    const score =
      (metadataOk ? 25 : 0) +
      (liquidityOk ? 25 : 0) +
      indexingScore +
      (authorityLocked ? 25 : 0);
    return {
      score,
      metadataOk,
      liquidityOk,
      authorityLocked,
      indexingState: indexing?.state ?? "NOT_INDEXED",
      label: score >= 75 ? "DEX READY" : "NOT READY",
    };
  }, [verification, result?.poolId, authorityStatus, indexing]);

  const totalSteps = 9;
  const progressPct = ((step + 1) / totalSteps) * 100;

  return (
    <PageLayout>
      <SEOHead
        title="Launch a Solana Token — PromoteMyMemes"
        description="Create your SPL token, add liquidity, lock LP, and start promotion in one guided mainnet flow."
        keywords="launch solana token, create spl token, raydium pool, streamflow lock, mainnet memecoin launch"
      />
      <main className="app-page-shell">
        <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="app-hero mb-6">
          <div className="app-hero-grid">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                <Badge variant="secondary">Solana launch flow</Badge>
                <Badge variant="outline">Wallet-led execution</Badge>
                <Badge variant="outline">LP lock ready</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Rocket className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="app-headline">Token Launch Engine</h1>
                    <p className="text-muted-foreground">Create → Liquidity → Lock → Index → Promote. One guided flow.</p>
                  </div>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Go from token setup to campaign-ready launch with a cleaner execution path designed for fast Solana memecoin rollouts.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Wallet", value: wallet.connected ? "Connected" : "Required" },
                  { label: "Network", value: network === "mainnet" ? "Mainnet" : isAdmin ? "Devnet" : "Mainnet" },
                  { label: "Progress", value: `${Math.round(progressPct)}%` },
                ].map((item) => (
                  <div key={item.label} className="app-muted-card p-4">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="mt-1 text-lg font-semibold">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="app-muted-card p-5">
              <div className="text-sm font-semibold">Launch blueprint</div>
              <div className="mt-4 space-y-3">
                {[
                  "Create token metadata and mint",
                  "Deploy SOL liquidity pool",
                  "Lock LP for trust signals",
                  "Trigger indexing and promotion",
                ].map((item, index) => (
                  <div key={item} className="rounded-xl border border-border bg-card/80 p-3">
                    <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                      {index + 1}
                    </div>
                    <div className="text-sm">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border px-6 py-4 lg:px-8">
            <Progress value={progressPct} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <div>
            {/* STEP 0: NETWORK */}
            {step === 0 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle>Step 1 — Start your launch</CardTitle>
                  <CardDescription>Everything below reflects the live mainnet launch flow and estimated on-chain costs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="destructive">Mainnet</Badge>
                        <Badge variant="outline">Live execution</Badge>
                        <Badge variant="outline">Wallet-signed</Badge>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Launch directly to the live Solana market</h3>
                        <p className="text-sm text-muted-foreground">
                          Your token mint, liquidity pool, LP lock, indexing, and promotion readiness all run through one production flow.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { label: "Token creation", value: "~0.012 SOL" },
                          { label: "Pool setup", value: "~0.2 SOL + LP" },
                          { label: "LP lock", value: "~0.005 SOL" },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-border bg-background/40 p-3">
                            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
                            <div className="mt-1 text-base font-semibold">{item.value}</div>
                          </div>
                        ))}
                      </div>
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Live network notice</AlertTitle>
                        <AlertDescription>
                          This creates a real on-chain token. You will pay network rent, transaction fees, and any liquidity you seed from your own wallet.
                        </AlertDescription>
                      </Alert>
                      {isAdmin && (
                        <div className="rounded-xl border border-border bg-background/40 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Admin-only network access</div>
                              <div className="text-xs text-muted-foreground">Use the internal test environment only when you need to validate flows.</div>
                            </div>
                            <Badge variant="secondary">Admin</Badge>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => setNetwork("mainnet")}
                              className={`rounded-lg border p-4 text-left transition ${network === "mainnet" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                            >
                              <div className="font-semibold">Mainnet</div>
                              <div className="text-sm text-muted-foreground">Default live flow for real launches</div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setNetwork("devnet")}
                              className={`rounded-lg border p-4 text-left transition ${network === "devnet" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                            >
                              <div className="font-semibold">Devnet</div>
                              <div className="text-sm text-muted-foreground">Internal testing mode for admins only</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <CostEstimator />
                  </div>
                  {!wallet.connected
                    ? <Button onClick={connect} className="w-full">Connect Wallet to Continue</Button>
                    : <Button onClick={() => setStep(1)} className="w-full">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                </CardContent>
              </Card>
            )}

            {/* STEP 1: TOKEN DETAILS */}
            {step === 1 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle>Step 2 — Token details</CardTitle>
                  <CardDescription>Core parameters of your SPL token.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div><Label htmlFor="name">Token name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Doggo Coin" maxLength={32} /></div>
                    <div><Label htmlFor="symbol">Symbol</Label><Input id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="DOGGO" maxLength={10} /></div>
                    <div>
                      <Label htmlFor="decimals">Decimals</Label>
                      <Input id="decimals" type="number" min={0} max={9} value={decimals} onChange={(e) => setDecimals(Number(e.target.value))} />
                      <p className="mt-1 text-xs text-muted-foreground">9 is standard for memecoins</p>
                    </div>
                    <div><Label htmlFor="supply">Total supply</Label><Input id="supply" type="number" min={1} value={totalSupply} onChange={(e) => setTotalSupply(Number(e.target.value))} /></div>
                  </div>
                  <div><Label htmlFor="desc">Description (optional)</Label><Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="The most based meme on Solana." rows={3} /></div>
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Authority is kept active during setup</AlertTitle>
                    <AlertDescription className="text-xs">
                      Mint &amp; freeze authority stay assigned to your wallet so you can attach metadata, fix mistakes, and add liquidity.
                      A dedicated "Authority Lock" step at the end lets you safely revoke them as the final trust signal.
                    </AlertDescription>
                  </Alert>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                    <Button onClick={() => { if (validateStep1()) setStep(2); }}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: BRANDING */}
            {step === 2 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle>Step 3 — Branding & socials</CardTitle>
                  <CardDescription>Logo and links go into on-chain Metaplex metadata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="logo">Logo (PNG/JPG/WEBP, max 200KB)</Label>
                    <Input id="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleLogoChange} />
                    {logoPreview && (
                      <div className="mt-3 flex items-center gap-3">
                        <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-full border object-cover" />
                        <span className="text-xs text-muted-foreground">{logoFile?.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <div><Label htmlFor="web">Website</Label><Input id="web" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourtoken.xyz" /></div>
                    <div><Label htmlFor="tw">Twitter / X</Label><Input id="tw" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/yourtoken" /></div>
                    <div><Label htmlFor="tg">Telegram</Label><Input id="tg" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="https://t.me/yourtoken" /></div>
                  </div>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={() => { if (validateStep2()) setStep(3); }}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: REVIEW + CREATE */}
            {step === 3 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle>Step 4 — Review & create token</CardTitle>
                  <CardDescription>One signature creates your mint, supply, and metadata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Network</span><span className="font-medium uppercase">{network}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Name / Symbol</span><span className="font-medium">{name} ({symbol})</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Supply</span><span className="font-medium">{totalSupply.toLocaleString()} (decimals {decimals})</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Mint authority</span><span className="font-medium">Retained (revoked later in safety step)</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Estimated cost</span><span className="font-medium">~0.012 SOL</span></div>
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1" />
                    <span className="text-muted-foreground">
                      I understand this creates a real on-chain SPL token. PromoteMyMemes does not custody the token or funds.
                      Memecoins are highly speculative and may lose all value.
                    </span>
                  </label>
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={busy}>Back</Button>
                    <Button onClick={handleCreateToken} disabled={busy || !acceptedTerms} size="lg">
                      {busy && busyLabel === "creating" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : (<><Rocket className="mr-2 h-4 w-4" />Create Token</>)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: METADATA VERIFICATION GATE + LIQUIDITY */}
            {step === 4 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Step 5 — Verify metadata &amp; add liquidity</CardTitle>
                  <CardDescription>Metadata must be valid on-chain before liquidity can be created.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metadata Verification Engine */}
                  <div className={`rounded-xl border p-4 ${verification?.ok ? "border-green-500/40 bg-green-500/5" : verification ? "border-destructive/50 bg-destructive/5" : "border-border bg-card/60"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {verification?.ok ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
                        ) : verification ? (
                          <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
                        ) : (
                          <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <div className="text-sm font-semibold">
                            Metadata Verification {verification ? (verification.ok ? "— PASS" : "— FAIL") : "— Pending"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Checks: account exists, update authority is your wallet, JSON loads, image loads.
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => runMetadataVerification(false)} disabled={verifying || !result?.mint}>
                        {verifying ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                        Re-check
                      </Button>
                    </div>

                    {verification && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs">
                        <div className="flex items-center gap-2">{verification.exists ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />} Metadata account exists</div>
                        <div className="flex items-center gap-2">{verification.updateAuthorityIsUser ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />} Update authority = your wallet</div>
                        <div className="flex items-center gap-2">{verification.fieldsComplete ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />} Name / symbol / URI present</div>
                        <div className="flex items-center gap-2">{verification.imageLoads ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />} Logo image reachable</div>
                      </div>
                    )}

                    {/* Live preview */}
                    {(verification?.name || logoPreview || verification?.imageUrl) && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3">
                        {(verification?.imageUrl || logoPreview) ? (
                          <img src={verification?.imageUrl || logoPreview!} alt="Token logo" className="h-12 w-12 rounded-full border object-cover" />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-background/40 text-xs font-semibold">{(symbol || "?").slice(0, 2)}</div>
                        )}
                        <div>
                          <div className="text-sm font-semibold">{verification?.name || name}</div>
                          <div className="text-xs text-muted-foreground">${verification?.symbol || symbol}</div>
                        </div>
                      </div>
                    )}

                    {verification && !verification.ok && verification.errors.length > 0 && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Fix required before liquidity</AlertTitle>
                        <AlertDescription>
                          <ul className="ml-4 list-disc text-xs">
                            {verification.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="rounded-lg border p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Mint</span><span className="font-mono text-xs">{result?.mint?.slice(0, 8)}…{result?.mint?.slice(-6)}</span></div>
                  </div>

                  <div>
                    <Label className="mb-2 block">Choose AMM</Label>
                    <div className="grid gap-2">
                      {AMM_OPTIONS.map((amm) => (
                        <button
                          key={amm.id}
                          type="button"
                          disabled={amm.status !== "live"}
                          onClick={() => setAmmChoice(amm.id)}
                          className={`rounded-lg border p-3 text-left transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            ammChoice === amm.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{amm.label}</span>
                            {amm.status === "coming-soon"
                              ? <Badge variant="secondary">Coming next</Badge>
                              : <Badge>Live</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{amm.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="lpToken">Tokens to deposit</Label>
                      <Input id="lpToken" type="number" min={1} value={lpTokenAmount} onChange={(e) => setLpTokenAmount(Number(e.target.value))} />
                      <p className="mt-1 text-xs text-muted-foreground">Recommend 30–80% of supply</p>
                    </div>
                    <div>
                      <Label htmlFor="lpSol">SOL to pair</Label>
                      <Input id="lpSol" type="number" min={0.01} step={0.01} value={lpSolAmount} onChange={(e) => setLpSolAmount(Number(e.target.value))} />
                      <p className="mt-1 text-xs text-muted-foreground">Min 0.5 SOL recommended on mainnet</p>
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription className="text-xs">
                      Initial price = SOL / Tokens. Pool creation fee ≈ 0.15 SOL on mainnet.
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-xl border border-border bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Estimated wallet requirement</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Keep extra SOL beyond your liquidity seed for pool rent, setup, and transaction fees.
                        </div>
                      </div>
                      <Badge variant="secondary">{estimatedLiquidityTotalSol.toFixed(3)} SOL total</Badge>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border bg-card/70 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Liquidity seed</div>
                        <div className="mt-1 text-base font-semibold">{lpSolAmount.toFixed(3)} SOL</div>
                      </div>
                      <div className="rounded-lg border border-border bg-card/70 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Setup buffer</div>
                        <div className="mt-1 text-base font-semibold">~{RAYDIUM_CPMM_BUFFER_SOL.toFixed(2)} SOL</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(5)} disabled={busy}>Skip liquidity</Button>
                    <Button onClick={handleAddLiquidity} disabled={busy || !verification?.ok} size="lg" title={!verification?.ok ? "Fix metadata verification first" : undefined}>
                      {busy && busyLabel === "lp" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating pool...</>) : (<><Droplets className="mr-2 h-4 w-4" />Create Pool</>)}
                    </Button>
                  </div>
                  {!verification?.ok && (
                    <p className="text-center text-xs text-destructive">Metadata must pass verification before you can create a liquidity pool.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* STEP 5: LOCK */}
            {step === 5 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Step 6 — Lock LP (Streamflow)</CardTitle>
                  <CardDescription>Locked LP signals trust to traders. Highly recommended.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Lock LP tokens</div>
                      <div className="text-xs text-muted-foreground">Self-lock with cliff via Streamflow</div>
                    </div>
                    <Switch checked={doLock} onCheckedChange={setDoLock} />
                  </div>
                  {doLock && (
                    <div>
                      <Label htmlFor="lockDays">Lock duration (days)</Label>
                      <Input id="lockDays" type="number" min={1} max={3650} value={lockDays} onChange={(e) => setLockDays(Number(e.target.value))} />
                      <p className="mt-1 text-xs text-muted-foreground">Longer = stronger trust signal. 30 days minimum recommended.</p>
                    </div>
                  )}
                  {!result?.lpMint && (
                    <Alert variant="destructive">
                      <AlertDescription>No LP mint found — skip if you didn't create a pool.</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(6)} disabled={busy}>Skip lock</Button>
                    {doLock && result?.lpMint && (
                      <Button onClick={handleLockLp} disabled={busy} size="lg">
                        {busy && busyLabel === "lock" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Locking...</>) : (<><Lock className="mr-2 h-4 w-4" />Lock LP</>)}
                      </Button>
                    )}
                    {(!doLock || !result?.lpMint) && (
                      <Button onClick={() => setStep(6)}>Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 6: AUTHORITY LOCK (final safety step) */}
            {step === 6 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Step 7 — Authority lock</CardTitle>
                  <CardDescription>Revoke mint &amp; freeze authority for permanent trust signals. This step is irreversible.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className={`rounded-xl border p-4 ${authorityStatus?.mintAuthorityNull ? "border-green-500/40 bg-green-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {authorityStatus?.mintAuthorityNull ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        Mint authority
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {authorityStatus?.mintAuthorityNull ? "Revoked — no one can mint more supply." : "Still active — your wallet can mint more supply."}
                      </div>
                    </div>
                    <div className={`rounded-xl border p-4 ${authorityStatus?.freezeAuthorityNull ? "border-green-500/40 bg-green-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        {authorityStatus?.freezeAuthorityNull ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        Freeze authority
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {authorityStatus?.freezeAuthorityNull ? "Revoked — no one can freeze holder accounts." : "Still active — your wallet can freeze accounts."}
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertTitle>Why revoke?</AlertTitle>
                    <AlertDescription className="text-xs">
                      Most DEX traders and aggregators flag tokens as risky if mint or freeze authority is still active. Revoking both is the
                      strongest trust signal you can ship.
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-wrap justify-between gap-2">
                    <Button variant="outline" onClick={() => setStep(5)} disabled={busy}>Back</Button>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setStep(7)} disabled={busy}>Skip for now</Button>
                      <Button
                        onClick={() => { setConfirmIrreversible(false); setAuthorityModalOpen(true); }}
                        disabled={busy || (authorityStatus?.mintAuthorityNull && authorityStatus?.freezeAuthorityNull)}
                        size="lg"
                      >
                        <Lock className="mr-2 h-4 w-4" />
                        {authorityStatus?.mintAuthorityNull && authorityStatus?.freezeAuthorityNull ? "Already locked" : "Revoke authorities"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 7: INDEXING + FINAL READINESS DASHBOARD */}
            {step === 7 && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Step 8 — Indexing &amp; final readiness</CardTitle>
                  <CardDescription>Live DEX visibility check and your DEX readiness score.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Final Readiness Scoreboard */}
                  <div className={`rounded-2xl border p-5 ${readiness.label === "DEX READY" ? "border-green-500/50 bg-green-500/5" : "border-yellow-500/50 bg-yellow-500/5"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">DEX Readiness</div>
                        <div className="mt-1 text-3xl font-bold">{readiness.score}<span className="text-base font-normal text-muted-foreground">/100</span></div>
                      </div>
                      <Badge variant={readiness.label === "DEX READY" ? "default" : "secondary"} className="text-sm">
                        {readiness.label}
                      </Badge>
                    </div>
                    <Progress value={readiness.score} className="mt-3" />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "Metadata", ok: readiness.metadataOk, pts: 25, fix: () => setStep(4) },
                        { label: "Liquidity", ok: readiness.liquidityOk, pts: 25, fix: () => setStep(4) },
                        { label: "Indexing", ok: readiness.indexingState === "FULLY_INDEXED", pts: 25, partial: readiness.indexingState === "PARTIAL", fix: refreshIndexing },
                        { label: "Authority lock", ok: readiness.authorityLocked, pts: 25, fix: () => setStep(6) },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            {row.ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : (row as any).partial ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                            <span>{row.label} <span className="text-xs text-muted-foreground">({row.pts} pts)</span></span>
                          </div>
                          {!row.ok && (
                            <Button size="sm" variant="outline" onClick={row.fix}>Fix now</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live indexing status */}
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Live indexing status</div>
                        <div className="text-xs text-muted-foreground">
                          {indexing ? (
                            indexing.state === "FULLY_INDEXED" ? "Fully indexed across major DEX feeds." :
                            indexing.state === "PARTIAL" ? "Partially indexed — needs more activity." :
                            "Not yet indexed. Trigger first trades to seed indexers."
                          ) : "Click re-check to query Dexscreener and Jupiter."}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={refreshIndexing} disabled={indexingChecking || !result?.mint}>
                        {indexingChecking ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                        Re-check
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {[
                        { label: "Dexscreener", ok: !!indexing?.dexscreener },
                        { label: "Jupiter", ok: !!indexing?.jupiter },
                        { label: "Raydium pair", ok: !!indexing?.raydium },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">
                          {row.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                          {row.label}: {row.ok ? "Indexed" : "Not yet"}
                        </div>
                      ))}
                    </div>
                    {indexing && indexing.state !== "FULLY_INDEXED" && result?.mint && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <a href={`https://jup.ag/swap/SOL-${result.mint}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3 w-3" />Trigger first trade on Jupiter</Button>
                        </a>
                        <a href={dexscreenerUrl(network, result.mint)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3 w-3" />Open Dexscreener</Button>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">Auto-start promotion campaign</div>
                      <div className="text-xs text-muted-foreground">Free Telegram-tier campaign launches once token is indexed</div>
                    </div>
                    <Switch checked={autoPromo} onCheckedChange={setAutoPromo} />
                  </div>

                  <Alert>
                    <Megaphone className="h-4 w-4" />
                    <AlertTitle>Indexing is automatic in the background</AlertTitle>
                    <AlertDescription className="text-xs">
                      We also re-check Dexscreener and Jupiter server-side every 5 minutes. Once indexed and (if enabled) promotion fires automatically.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(6)} disabled={busy}>Back</Button>
                    <Button onClick={handleFinalize} disabled={busy} size="lg">
                      {busy && busyLabel === "index" ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Triggering...</>) : (<>Finalize Launch <ArrowRight className="ml-2 h-4 w-4" /></>)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 8: SUCCESS */}
            {step === 8 && result && (
              <Card className="app-panel rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-primary" /> Launch complete!
                  </CardTitle>
                  <CardDescription>Your token is live on Solana {network}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="rounded-xl border border-border bg-card/80 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                          {logoPreview ? (
                            <img src={logoPreview} alt={`${name} token logo`} className="h-20 w-20 rounded-2xl border border-border object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-background/40 text-2xl font-semibold">
                              {(symbol || "?").slice(0, 2)}
                            </div>
                          )}
                          <div className="space-y-2">
                            <div>
                              <div className="text-xl font-semibold">{name}</div>
                              <div className="text-sm text-muted-foreground">${symbol} • {network === "mainnet" ? "Mainnet" : "Devnet"} launch</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">Supply {totalSupply.toLocaleString()}</Badge>
                              <Badge variant="outline">Decimals {decimals}</Badge>
                              <Badge variant="outline">{result.lockId ? `LP Locked ${lockDays}d` : "LP lock optional"}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={copyLaunchMessage}><Copy className="mr-2 h-4 w-4" />Copy post</Button>
                          <Button size="sm" onClick={shareLaunchMessage}><Share2 className="mr-2 h-4 w-4" />Share</Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Token address</div>
                          <div className="mt-1 break-all font-mono text-xs">{result.mint}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Liquidity</div>
                          <div className="mt-1 text-sm font-semibold">{result.poolId ? `${lpSolAmount.toLocaleString()} SOL + ${lpTokenAmount.toLocaleString()} ${symbol}` : "Pending / skipped"}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pool status</div>
                          <div className="mt-1 break-all font-mono text-xs">{result.poolId || "No pool created yet"}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Trust signal</div>
                          <div className="mt-1 text-sm font-semibold">{result.lockId ? `LP locked until ${result.unlockAt ? new Date(result.unlockAt).toLocaleDateString() : "scheduled"}` : authorityStatus?.mintAuthorityNull ? "Mint revoked" : "Launch live"}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 pt-2">
                      {result.mint && (
                        <a href={explorerUrl(network, result.mint, "address")} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3 w-3" />Solscan</Button>
                        </a>
                      )}
                      {result.mint && (
                        <a href={dexscreenerUrl(network, result.mint)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3 w-3" />Dexscreener</Button>
                        </a>
                      )}
                      {result.lockId && (
                        <a href={streamflowExplorerUrl(network, result.lockId)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3 w-3" />Streamflow</Button>
                        </a>
                      )}
                      {result.metadataUri && (
                        <a href={result.metadataUri} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm"><ExternalLink className="mr-1 h-3 w-3" />Metadata</Button>
                        </a>
                      )}
                    </div>
                  </div>

                    <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">Ready-to-post launch message</div>
                          <div className="text-xs text-muted-foreground">Use this on X, Telegram, Discord, or your community channels.</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={copyLaunchMessage}><Copy className="mr-2 h-4 w-4" />Copy</Button>
                      </div>
                      <div className="mt-4 rounded-xl border border-border bg-card/80 p-4">
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">{launchShareMessage}</pre>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
                    <Link to={`/my-tokens/${result.launchId}`}><Button variant="outline">View token details</Button></Link>
                    <Link
                      to={`/campaign-engine?tokenAddress=${encodeURIComponent(result.mint ?? "")}&tokenSymbol=${encodeURIComponent(symbol)}`}
                    >
                      <Button variant="outline">Boost Promotion</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="app-panel rounded-2xl">
              <CardHeader><CardTitle className="text-base">Launch progress</CardTitle></CardHeader>
              <CardContent><LaunchProgress phases={phases} /></CardContent>
            </Card>
            <Card className="app-panel rounded-2xl">
              <CardHeader><CardTitle className="text-base">Trust signals</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div>{verification?.ok ? "✓" : result?.mint ? "⚠" : "○"} On-chain Metaplex metadata</div>
                <div>{authorityStatus?.mintAuthorityNull ? "✓" : "○"} Mint authority revoked</div>
                <div>{authorityStatus?.freezeAuthorityNull ? "✓" : "○"} Freeze authority revoked</div>
                <div>{result?.poolId ? "✓" : "○"} Liquidity added</div>
                <div>{result?.lockId ? "✓" : "○"} LP locked ({lockDays}d)</div>
                <div>{indexing?.dexscreener ? "✓" : "○"} Indexed on Dexscreener</div>
                <div>{indexing?.jupiter ? "✓" : "○"} Indexed on Jupiter</div>
              </CardContent>
            </Card>
          </aside>
        </div>
        </div>

        {/* Authority revoke confirmation modal */}
        <Dialog open={authorityModalOpen} onOpenChange={setAuthorityModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Irreversible action
              </DialogTitle>
              <DialogDescription>
                Once you revoke mint &amp; freeze authority, you <strong>CANNOT</strong>:
                <ul className="ml-5 mt-2 list-disc text-sm">
                  <li>change the token metadata</li>
                  <li>mint additional supply</li>
                  <li>fix mistakes (typos, wrong logo, wrong socials)</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmRevokeMint} onChange={(e) => setConfirmRevokeMint(e.target.checked)} disabled={!!authorityStatus?.mintAuthorityNull} />
                Revoke mint authority {authorityStatus?.mintAuthorityNull && <Badge variant="secondary" className="text-[10px]">already revoked</Badge>}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={confirmRevokeFreeze} onChange={(e) => setConfirmRevokeFreeze(e.target.checked)} disabled={!!authorityStatus?.freezeAuthorityNull} />
                Revoke freeze authority {authorityStatus?.freezeAuthorityNull && <Badge variant="secondary" className="text-[10px]">already revoked</Badge>}
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmIrreversible} onChange={(e) => setConfirmIrreversible(e.target.checked)} className="mt-1" />
                <span className="text-muted-foreground">
                  I understand this is permanent and PromoteMyMemes cannot reverse it for me.
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAuthorityModalOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="destructive" onClick={handleRevokeAuthorities} disabled={busy || !confirmIrreversible}>
                {busy && busyLabel === "revoke" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Revoking...</> : <><Lock className="mr-2 h-4 w-4" />Confirm revoke</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </PageLayout>
  );
}
