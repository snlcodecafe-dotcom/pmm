import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AccountMenu } from "@/components/AccountMenu";
import { useAuth } from "@/hooks/useAuth";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { User as UserIcon, Wallet as WalletIcon, Trash2, Check, AlertCircle, Plus, Star } from "lucide-react";
import PartnerChannelsManager from "@/components/PartnerChannelsManager";

type LinkedWallet = { id: string; wallet_address: string; is_primary: boolean; verified_at: string };

export default function Profile() {
  const { user, profile, loading, reloadProfile } = useAuth();
  const { wallet, connect } = useSolanaWallet();
  const { signMessage, publicKey } = useWallet();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(""); const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false); const [savedProfile, setSavedProfile] = useState(false);
  const [wallets, setWallets] = useState<LinkedWallet[]>([]);
  const [linking, setLinking] = useState(false); const [error, setError] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth"); }, [loading, user, navigate]);
  useEffect(() => { if (profile) { setDisplayName(profile.display_name ?? ""); setBio(profile.bio ?? ""); } }, [profile]);
  useEffect(() => { if (user) loadWallets(); }, [user]);

  async function loadWallets() {
    if (!user) return;
    const { data } = await supabase.from("user_wallets").select("*").eq("user_id", user.id).order("is_primary", { ascending: false });
    setWallets((data as LinkedWallet[]) ?? []);
  }

  async function saveProfile() {
    if (!user) return;
    setSavingProfile(true); setSavedProfile(false);
    const { error: err } = await supabase.from("profiles").upsert({ user_id: user.id, display_name: displayName.trim() || null, bio: bio.trim() || null }, { onConflict: "user_id" });
    if (!err) { setSavedProfile(true); reloadProfile(); setTimeout(() => setSavedProfile(false), 2000); }
    setSavingProfile(false);
  }

  async function linkWallet() {
    setError(null); setInfo(null);
    if (!wallet.connected || !publicKey || !signMessage) { setError("Connect a wallet first."); return; }
    if (!user) return;
    if (wallets.some(w => w.wallet_address === publicKey.toBase58())) { setError("This wallet is already linked."); return; }
    setLinking(true);
    try {
      // Issue a nonce
      const nonce = crypto.randomUUID();
      const { error: nErr } = await supabase.from("wallet_claim_nonces").insert({ user_id: user.id, wallet_address: publicKey.toBase58(), nonce });
      if (nErr) throw nErr;

      const message = new TextEncoder().encode(`PromoteMyMemes wallet link\nUser: ${user.id}\nNonce: ${nonce}`);
      const sig = await signMessage(message);
      const sigB58 = bs58.encode(sig);

      // Verify via edge function
      const { data, error: fnErr } = await supabase.functions.invoke("claim-wallet", {
        body: { wallet_address: publicKey.toBase58(), nonce, signature: sigB58, set_primary: wallets.length === 0 },
      });
      const body = data as { ok?: boolean; error?: string; backfilled_launches?: number; backfilled_submissions?: number } | null;
      if (fnErr || !body?.ok) throw new Error(body?.error || fnErr?.message || "Verification failed");
      setInfo(`Wallet linked! Backfilled ${body.backfilled_launches ?? 0} launches and ${body.backfilled_submissions ?? 0} promotions.`);
      await loadWallets();
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setLinking(false); }
  }

  async function unlinkWallet(id: string) {
    if (!confirm("Unlink this wallet? Your tokens stay claimed but you'll need to re-verify to add it back.")) return;
    await supabase.from("user_wallets").delete().eq("id", id);
    await loadWallets();
  }

  async function setPrimary(id: string, address: string) {
    if (!user) return;
    await supabase.from("user_wallets").update({ is_primary: false }).eq("user_id", user.id);
    await supabase.from("user_wallets").update({ is_primary: true }).eq("id", id);
    await supabase.from("profiles").update({ primary_wallet: address }).eq("user_id", user.id);
    const code = `${address.slice(0, 4).toUpperCase()}${address.slice(-4).toUpperCase()}`;
    const { data: existingReferral } = await supabase.from("referral_codes").select("id").eq("wallet_address", address).maybeSingle();
    if (!existingReferral) {
      await supabase.from("referral_codes").insert({ wallet_address: address, code });
    }
    await loadWallets(); reloadProfile();
  }

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      
      <main className="container max-w-3xl pt-6 pb-16 px-4 space-y-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><UserIcon className="w-6 h-6" style={{ color: "hsl(var(--purple))" }} /> Profile</h1>
          <p className="text-xs text-muted-foreground">Signed in as <span className="font-mono">{user.email}</span></p>
        </div>

        {/* Profile */}
        <section className="rounded-xl border p-5 space-y-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <h2 className="font-bold text-sm">Display</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-bold block mb-1">Display name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Satoshi" maxLength={50}
                className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-bold block mb-1">Primary wallet</label>
              <input readOnly value={profile?.primary_wallet ?? "—"} className="w-full px-3 py-2 rounded-lg text-sm border font-mono text-muted-foreground"
                style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-bold block mb-1">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={300} rows={3} placeholder="Tell the community about yourself"
              className="w-full px-3 py-2 rounded-lg text-sm border" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }} />
          </div>
          <button onClick={saveProfile} disabled={savingProfile}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.85))" }}>
            {savedProfile ? <><Check className="inline w-3.5 h-3.5 mr-1" /> Saved</> : savingProfile ? "Saving…" : "Save profile"}
          </button>
        </section>

        {/* Wallets */}
        <section className="rounded-xl border p-5 space-y-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-sm flex items-center gap-2"><WalletIcon className="w-4 h-4" /> Linked wallets</h2>
            <div className="flex items-center gap-2">
              {!wallet.connected ? (
                <button onClick={connect} className="px-3 py-1.5 rounded-lg text-xs font-bold border" style={{ borderColor: "hsl(var(--purple) / 0.4)", color: "hsl(var(--purple))" }}>
                  Connect a wallet first
                </button>
              ) : (
                <button onClick={linkWallet} disabled={linking}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.85))" }}>
                  <Plus className="w-3.5 h-3.5" /> {linking ? "Verifying…" : `Link ${wallet.publicKey?.slice(0, 6)}…${wallet.publicKey?.slice(-4)}`}
                </button>
              )}
            </div>
          </div>
          {error && <div className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5" /> {error}</div>}
          {info && <div className="text-xs p-2 rounded" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))" }}>{info}</div>}
          <div className="space-y-2">
            {wallets.length === 0 && <p className="text-xs text-muted-foreground">No wallets linked yet. Connect a Solana wallet, then click Link to claim ownership of all tokens you launched with it.</p>}
            {wallets.map(w => (
              <div key={w.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }}>
                <div className="font-mono text-xs truncate flex items-center gap-2">
                  {w.is_primary && <Star className="w-3.5 h-3.5" style={{ color: "hsl(var(--cyan))" }} />}
                  {w.wallet_address}
                </div>
                <div className="flex items-center gap-2">
                  {!w.is_primary && <button onClick={() => setPrimary(w.id, w.wallet_address)} className="text-[10px] underline text-muted-foreground hover:text-foreground">Make primary</button>}
                  <button onClick={() => unlinkWallet(w.id)} className="text-destructive p-1 hover:opacity-70"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">Linking a wallet requires signing a message (free, no transaction). All your past launches and promotions made from that wallet will be automatically claimed.</p>
        </section>

        {/* Partner channels */}
        <PartnerChannelsManager />
      </main>
    </div>
  );
}
