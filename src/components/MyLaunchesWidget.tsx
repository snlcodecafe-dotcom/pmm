import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Rocket, ExternalLink, CheckCircle2, Circle, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { explorerUrl, type SolanaNetwork } from "@/lib/tokenLauncher";
import { buildAlphaMemeSniperUrl, getLaunchNextActionLabel, getLaunchResumeStep } from "@/lib/launchProgress";

type Launch = {
  id: string;
  network: string;
  mint_address: string;
  token_name: string;
  token_symbol: string;
  logo_url: string | null;
  token_created: boolean;
  metadata_attached: boolean;
  liquidity_added: boolean;
  liquidity_locked: boolean;
  indexed_dexscreener: boolean;
  indexed_jupiter: boolean;
  promotion_started: boolean;
  amm_type: string | null;
  pool_address: string | null;
  lock_unlock_at: string | null;
  created_at: string;
};

const PHASES: { key: keyof Launch; label: string }[] = [
  { key: "token_created", label: "Token" },
  { key: "metadata_attached", label: "Metadata" },
  { key: "liquidity_added", label: "Liquidity" },
  { key: "liquidity_locked", label: "Lock" },
  { key: "indexed_dexscreener", label: "Indexed" },
  { key: "promotion_started", label: "Promo" },
];

interface Props {
  walletAddress: string | null;
  userId?: string | null;
}

export function MyLaunchesWidget({ walletAddress, userId }: Props) {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Token address copied");
    } catch {
      toast.error("Could not copy address");
    }
  };

  useEffect(() => {
    if (!walletAddress && !userId) { setLoading(false); return; }
    (async () => {
      let q = supabase.from("token_launches").select("*").order("created_at", { ascending: false }).limit(5);
      if (userId && walletAddress) {
        q = q.or(`user_id.eq.${userId},wallet_address.eq.${walletAddress}`);
      } else if (userId) {
        q = q.eq("user_id", userId);
      } else if (walletAddress) {
        q = q.eq("wallet_address", walletAddress);
      }
      const { data } = await q;
      setLaunches((data as Launch[]) || []);
      setLoading(false);
    })();
  }, [walletAddress, userId]);

  return (
    <div className="rounded-xl border p-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">My Token Launches</h3>
        </div>
        <Link to="/launch-token" className="text-xs font-semibold text-primary hover:underline">
          + Launch new
        </Link>
      </div>

      {!walletAddress && (
        <p className="text-xs text-muted-foreground py-4 text-center">Connect wallet to see your launches.</p>
      )}
      {walletAddress && loading && (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
      )}
      {walletAddress && !loading && launches.length === 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground mb-3">No tokens launched yet.</p>
          <Link to="/launch-token" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
            <Rocket className="w-3 h-3" /> Launch your first token
          </Link>
        </div>
      )}
      {walletAddress && !loading && launches.length > 0 && (
        <ul className="space-y-3">
          {launches.map((l) => (
            <li key={l.id} className="rounded-lg border p-3" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="flex items-center gap-2 mb-2">
                {l.logo_url ? (
                  <img src={l.logo_url} alt={l.token_symbol} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{l.token_symbol[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{l.token_name} <span className="text-muted-foreground">({l.token_symbol})</span></div>
                  <div className="text-[10px] text-muted-foreground uppercase">{l.network}</div>
                </div>
                <a
                  href={explorerUrl(l.network as SolanaNetwork, l.mint_address, "address")}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PHASES.map((p) => {
                  const done = !!l[p.key];
                  return (
                    <span
                      key={p.key}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: done ? "hsl(120 70% 50% / 0.15)" : "hsl(var(--muted) / 0.5)",
                        color: done ? "hsl(120 70% 50%)" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Circle className="w-2 h-2" />}
                      {p.label}
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyAddress(l.mint_address)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Copy className="w-3 h-3" /> Copy address
                </button>
                <Link
                  to={`/launch-token?launchId=${encodeURIComponent(l.id)}&step=${getLaunchResumeStep(l)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  {getLaunchNextActionLabel(l)}
                </Link>
                <Link
                  to={`/my-tokens/${l.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3 h-3" /> Details
                </Link>
                <a
                  href={buildAlphaMemeSniperUrl(l.mint_address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3 h-3" /> AlphaMemeSniper
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
