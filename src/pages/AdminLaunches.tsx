import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Flag, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { explorerUrl, type SolanaNetwork } from "@/lib/tokenLauncher";

const ADMIN_PASS_KEY = "pm_admin_authed";

type Launch = {
  id: string;
  wallet_address: string;
  network: string;
  mint_address: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  total_supply: number;
  logo_url: string | null;
  metadata_uri: string | null;
  flagged: boolean;
  flag_reason: string | null;
  liquidity_added: boolean;
  liquidity_locked: boolean;
  indexed_dexscreener: boolean;
  promotion_started: boolean;
  amm_type: string | null;
  created_at: string;
};

export default function AdminLaunches() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(ADMIN_PASS_KEY) === "1");
  const [pw, setPw] = useState("");
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("token_launches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLaunches((data as Launch[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === "SNL250225") {
      sessionStorage.setItem(ADMIN_PASS_KEY, "1");
      setAuthed(true);
      setErr("");
    } else {
      setErr("Incorrect password");
    }
  };

  const toggleFlag = async (l: Launch) => {
    const reason = l.flagged ? null : (prompt("Flag reason?") || "Suspicious");
    if (!l.flagged && reason === null) return;
    await supabase
      .from("token_launches")
      .update({ flagged: !l.flagged, flag_reason: reason })
      .eq("id", l.id);
    load();
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl border p-8 space-y-4 bg-surface-1">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-lg">Admin · Launches</h1>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Admin password"
            className="w-full bg-surface-2 border rounded-lg px-4 py-3 text-sm"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button type="submit" className="w-full py-3 rounded-lg font-bold text-sm bg-primary text-primary-foreground">
            Login
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center">
            <ArrowLeft className="w-3 h-3" /> Back
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-2xl">Token Launches</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="text-xs px-3 py-2 rounded-lg bg-surface-2">Main Admin</Link>
            <Link to="/" className="text-xs px-3 py-2 rounded-lg bg-surface-2">Site</Link>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        )}

        <div className="rounded-xl border overflow-hidden bg-surface-1">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Token</th>
                <th className="text-left p-3">Network</th>
                <th className="text-left p-3">Mint</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Wallet</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Flag</th>
              </tr>
            </thead>
            <tbody>
              {launches.map((l) => (
                <tr key={l.id} className={`border-t ${l.flagged ? "bg-destructive/5" : ""}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {l.logo_url && <img src={l.logo_url} alt="" className="w-6 h-6 rounded-full object-cover" />}
                      <div>
                        <div className="font-semibold">{l.token_name}</div>
                        <div className="text-xs text-muted-foreground">{l.token_symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 uppercase text-xs">{l.network}</td>
                  <td className="p-3">
                    <a
                      href={explorerUrl(l.network as SolanaNetwork, l.mint_address, "address")}
                      target="_blank" rel="noreferrer"
                      className="font-mono text-xs hover:underline inline-flex items-center gap-1"
                    >
                      {l.mint_address.slice(0, 6)}…{l.mint_address.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded ${l.liquidity_added ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>LP</span>
                      <span className={`px-1.5 py-0.5 rounded ${l.liquidity_locked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>Lock</span>
                      <span className={`px-1.5 py-0.5 rounded ${l.indexed_dexscreener ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>Idx</span>
                      <span className={`px-1.5 py-0.5 rounded ${l.promotion_started ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>Promo</span>
                    </div>
                    {l.amm_type && <div className="text-[10px] text-muted-foreground mt-1">{l.amm_type}</div>}
                  </td>
                  <td className="p-3 font-mono text-xs">{l.wallet_address.slice(0, 6)}…{l.wallet_address.slice(-4)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleFlag(l)}
                      className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${l.flagged ? "bg-destructive text-destructive-foreground" : "bg-surface-2"}`}
                    >
                      <Flag className="w-3 h-3" /> {l.flagged ? "Flagged" : "Flag"}
                    </button>
                    {l.flagged && l.flag_reason && (
                      <div className="text-[10px] text-destructive mt-1">{l.flag_reason}</div>
                    )}
                  </td>
                </tr>
              ))}
              {launches.length === 0 && !loading && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No launches yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
