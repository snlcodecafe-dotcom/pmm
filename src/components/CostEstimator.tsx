import { Coins, Droplets, Lock, Search, Megaphone } from "lucide-react";

const ROWS = [
  { phase: "1. Create Token", icon: <Coins className="w-3.5 h-3.5" />, range: "≈ 0.012 SOL", detail: "Mint rent-exempt + metadata account + tx fees" },
  { phase: "2. Add Liquidity (Raydium CPMM)", icon: <Droplets className="w-3.5 h-3.5" />, range: "≈ 0.2 SOL + your pool seed", detail: "Pool init rent + your token + SOL liquidity" },
  { phase: "3. Lock LP (Streamflow)", icon: <Lock className="w-3.5 h-3.5" />, range: "≈ 0.005 SOL + 0.1% LP", detail: "One-time vesting account + Streamflow protocol fee" },
  { phase: "4. Index (Dexscreener / Jupiter)", icon: <Search className="w-3.5 h-3.5" />, range: "Free", detail: "Passive — auto-detected within 2-15 min after liquidity" },
  { phase: "5. Promote", icon: <Megaphone className="w-3.5 h-3.5" />, range: "Free → 0.5 SOL+", detail: "Basic auto-promo is free; paid plans add reach (set in admin/packages)" },
];

export function CostEstimator() {
  return (
    <div className="rounded-xl border p-4 space-y-2" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Estimated costs</h3>
        <span className="text-[10px] text-muted-foreground">Mainnet figures (devnet is free, faucet)</span>
      </div>
      <div className="space-y-1.5">
        {ROWS.map(r => (
          <div key={r.phase} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
            <div className="mt-0.5" style={{ color: "hsl(var(--cyan))" }}>{r.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold">{r.phase}</div>
                <div className="text-[11px] font-mono font-bold" style={{ color: "hsl(var(--purple))" }}>{r.range}</div>
              </div>
              <div className="text-[10px] text-muted-foreground">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground border-t pt-2" style={{ borderColor: "hsl(var(--border))" }}>
        Total typical mainnet cost (excluding your liquidity seed): <span className="font-bold text-foreground">~0.22 SOL</span>.
        Numbers may vary with network congestion and provider fees.
      </div>
    </div>
  );
}
