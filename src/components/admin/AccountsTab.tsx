import { useEffect, useState, useCallback } from "react";
import { DollarSign, Download, RefreshCw, TrendingUp, Wallet, Activity, Filter, Settings, X, ExternalLink } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Tx = {
  id: string;
  occurred_at: string;
  tx_type: string;
  source: string;
  destination: string;
  amount_sol: number;
  sol_usd_at_time: number | null;
  amount_usd_at_time: number | null;
  token_symbol: string | null;
  token_address: string | null;
  network: string | null;
  user_id: string | null;
  wallet_address: string | null;
  partner_user_id: string | null;
  referral_code: string | null;
  tx_signature: string | null;
  notes: string | null;
};

type Summary = {
  sol_usd: number;
  network: string;
  kpis: {
    launchFees: number; promoFees: number; tradingFees: number;
    partnerComm: number; partnerPaid: number; liquidity: number; gas: number;
    pmmGross: number; pmmNet: number; partnerPending: number; totalTransactions: number;
  };
  tokens: Array<{
    token_address: string; token_symbol: string; network: string | null;
    user_spent_sol: number; liquidity_sol: number;
    pmm_revenue_sol: number; partner_commissions_sol: number; gas_sol: number; trading_fees_sol: number;
    tx_count: number;
  }>;
};

const TX_TYPES = [
  "", "launch_fee", "promotion_fee", "mint_creation", "metadata_pin",
  "liquidity", "lp_lock", "authority_revoke", "indexer_submission",
  "gas_fee", "partner_commission", "partner_payout", "trading_fee", "refund", "adjustment",
];

type NetworkFilter = "mainnet" | "devnet" | "all";

export function AccountsTab({ password }: { password: string }) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ledger, setLedger] = useState<Tx[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [filter, setFilter] = useState({ tx_type: "", token_address: "", from: "", to: "" });
  const [view, setView] = useState<"overview" | "tokens" | "ledger" | "accounts" | "settings">("overview");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [network, setNetwork] = useState<NetworkFilter>("mainnet");
  const [launchFee, setLaunchFee] = useState<string>("0");
  const [tokenDetail, setTokenDetail] = useState<{ addr: string; symbol: string; rows: Tx[] } | null>(null);

  const call = useCallback(async (action: string, extra: any = {}) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/finance-admin?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ action, password, ...extra }),
    });
    return res;
  }, [password]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call("summary", { network });
      const j = await res.json();
      if (j.ok) setSummary(j);
    } finally { setLoading(false); }
  }, [call, network]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await call("ledger", {
        tx_type: filter.tx_type || undefined,
        token_address: filter.token_address || undefined,
        from: filter.from || undefined,
        to: filter.to || undefined,
        network,
        limit: 500,
      });
      const j = await res.json();
      if (j.ok) { setLedger(j.rows); setLedgerTotal(j.total); }
    } finally { setLoading(false); }
  }, [call, filter, network]);

  const loadAccounts = useCallback(async () => {
    const res = await call("accounts");
    const j = await res.json();
    if (j.ok) setAccounts(j.accounts);
  }, [call]);

  const loadSettings = useCallback(async () => {
    const res = await call("get_settings");
    const j = await res.json();
    if (j.ok) setLaunchFee(j.settings?.launch_fee_sol ?? "0");
  }, [call]);

  useEffect(() => { loadSummary(); loadAccounts(); loadSettings(); }, [loadSummary, loadAccounts, loadSettings]);
  useEffect(() => { if (view === "ledger") loadLedger(); }, [view, loadLedger]);

  const runBackfill = async () => {
    setBusy("backfill");
    try {
      const res = await call("backfill");
      const j = await res.json();
      alert(j.ok ? `Backfill complete. Inserted ${j.inserted} transactions.` : `Failed: ${j.error}`);
      await loadSummary(); await loadAccounts();
    } finally { setBusy(null); }
  };

  const exportCsv = async () => {
    setBusy("csv");
    try {
      const res = await call("export_csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `pmm-ledger-${network}-${Date.now()}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } finally { setBusy(null); }
  };

  const saveLaunchFee = async () => {
    setBusy("fee");
    try {
      const res = await call("set_launch_fee", { fee_sol: launchFee });
      const j = await res.json();
      if (j.ok) alert(`Launch fee set to ${j.fee_sol} SOL`);
    } finally { setBusy(null); }
  };

  const openTokenDetail = async (addr: string, symbol: string) => {
    const res = await call("token_detail", { token_address: addr });
    const j = await res.json();
    if (j.ok) setTokenDetail({ addr, symbol, rows: j.rows });
  };

  const usd = summary?.sol_usd ?? 0;
  const fmtSol = (n: number) => `${n.toFixed(4)} SOL`;
  const fmtUsd = (n: number) => usd > 0 ? `$${(n * usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
  const explorerUrl = (sig: string, net: string | null) =>
    `https://solscan.io/tx/${sig}${net === "devnet" ? "?cluster=devnet" : ""}`;

  return (
    <div className="space-y-4">
      {/* Sub-nav */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { k: "overview", l: "Overview", i: <DollarSign className="w-3 h-3" /> },
            { k: "tokens", l: "Token P&L", i: <TrendingUp className="w-3 h-3" /> },
            { k: "ledger", l: "Ledger", i: <Activity className="w-3 h-3" /> },
            { k: "accounts", l: "Accounts", i: <Wallet className="w-3 h-3" /> },
            { k: "settings", l: "Settings", i: <Settings className="w-3 h-3" /> },
          ].map(t => (
            <button key={t.k} onClick={() => setView(t.k as any)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: view === t.k ? "hsl(var(--purple) / 0.2)" : "hsl(var(--surface-2))",
                color: view === t.k ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))",
                border: `1px solid ${view === t.k ? "hsl(var(--purple) / 0.4)" : "hsl(var(--border))"}`,
              }}>{t.i}{t.l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Network toggle */}
          <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-semibold">
            {(["mainnet", "devnet", "all"] as NetworkFilter[]).map(n => (
              <button key={n} onClick={() => setNetwork(n)}
                className="px-3 py-1.5 capitalize"
                style={{
                  background: network === n
                    ? (n === "mainnet" ? "hsl(142 70% 50% / 0.2)" : n === "devnet" ? "hsl(45 90% 55% / 0.2)" : "hsl(var(--purple) / 0.2)")
                    : "hsl(var(--surface-2))",
                  color: network === n
                    ? (n === "mainnet" ? "hsl(142 70% 50%)" : n === "devnet" ? "hsl(45 90% 55%)" : "hsl(var(--purple))")
                    : "hsl(var(--muted-foreground))",
                }}>{n}</button>
            ))}
          </div>
          <button onClick={loadSummary} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-surface-2">
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={runBackfill} disabled={busy === "backfill"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))" }}>
            {busy === "backfill" ? "Backfilling..." : "Backfill"}
          </button>
          <button onClick={exportCsv} disabled={busy === "csv"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-surface-2">
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* Live SOL price + scope hint */}
      {summary && (
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
          <span>Live SOL/USD: <span className="text-foreground font-mono">${usd.toFixed(2)}</span></span>
          <span>Scope: <span className="text-foreground font-semibold capitalize">{network}</span></span>
          <span>Total entries: <span className="text-foreground font-mono">{summary.kpis.totalTransactions}</span></span>
          {network !== "mainnet" && (
            <span className="text-yellow-500">⚠ Includes test/devnet activity — KPIs are NOT real revenue</span>
          )}
        </div>
      )}

      {/* OVERVIEW */}
      {view === "overview" && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KCard label="PMM Gross Revenue" sol={summary.kpis.pmmGross} usd={fmtUsd(summary.kpis.pmmGross)} accent="purple" />
            <KCard label="PMM Net (after partners)" sol={summary.kpis.pmmNet} usd={fmtUsd(summary.kpis.pmmNet)} accent="cyan" />
            <KCard label="Partner Pending" sol={summary.kpis.partnerPending} usd={fmtUsd(summary.kpis.partnerPending)} accent="yellow" />
            <KCard label="Partner Paid" sol={summary.kpis.partnerPaid} usd={fmtUsd(summary.kpis.partnerPaid)} accent="green" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KCard label="Promotion Fees" sol={summary.kpis.promoFees} usd={fmtUsd(summary.kpis.promoFees)} />
            <KCard label="Launch Fees" sol={summary.kpis.launchFees} usd={fmtUsd(summary.kpis.launchFees)} />
            <KCard label="Liquidity (user-funded)" sol={summary.kpis.liquidity} usd={fmtUsd(summary.kpis.liquidity)} />
            <KCard label="On-chain Gas/Fees" sol={summary.kpis.gas} usd={fmtUsd(summary.kpis.gas)} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            "On-chain Gas/Fees" combines mint creation, metadata, pool, lock, revoke and indexer submission costs paid by the user.
          </p>
        </div>
      )}

      {/* TOKEN P&L */}
      {view === "tokens" && summary && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "hsl(var(--surface-1))" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: "hsl(var(--surface-2))" }}>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2">Net</th>
                  <th className="px-3 py-2 text-right">User Spent</th>
                  <th className="px-3 py-2 text-right">Liquidity</th>
                  <th className="px-3 py-2 text-right">Gas</th>
                  <th className="px-3 py-2 text-right">PMM Rev.</th>
                  <th className="px-3 py-2 text-right">Partner</th>
                  <th className="px-3 py-2 text-right">Txs</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {summary.tokens.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No token transactions yet. Run backfill or wait for new launches.</td></tr>
                )}
                {summary.tokens.map(t => (
                  <tr key={t.token_address} className="border-t border-border hover:bg-surface-2/50">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{t.token_symbol || "—"}</div>
                      <div className="font-mono text-muted-foreground text-[10px]">{t.token_address.slice(0, 8)}…{t.token_address.slice(-6)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <NetBadge n={t.network} />
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtSol(t.user_spent_sol)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtSol(t.liquidity_sol)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtSol(t.gas_sol)}</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ color: "hsl(var(--purple))" }}>{fmtSol(t.pmm_revenue_sol)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtSol(t.partner_commissions_sol)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{t.tx_count}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => openTokenDetail(t.token_address, t.token_symbol)}
                        className="text-[10px] px-2 py-1 rounded border border-border hover:bg-surface-2">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LEDGER */}
      {view === "ledger" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-border" style={{ background: "hsl(var(--surface-1))" }}>
            <Filter className="w-4 h-4 text-muted-foreground self-center" />
            <FilterField label="Type">
              <select value={filter.tx_type} onChange={e => setFilter({ ...filter, tx_type: e.target.value })}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs">
                {TX_TYPES.map(t => <option key={t} value={t}>{t || "All"}</option>)}
              </select>
            </FilterField>
            <FilterField label="Token address">
              <input value={filter.token_address} onChange={e => setFilter({ ...filter, token_address: e.target.value })}
                placeholder="mint…" className="bg-surface-2 border border-border rounded px-2 py-1 text-xs font-mono w-56" />
            </FilterField>
            <FilterField label="From">
              <input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs" />
            </FilterField>
            <FilterField label="To">
              <input type="date" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })}
                className="bg-surface-2 border border-border rounded px-2 py-1 text-xs" />
            </FilterField>
            <button onClick={loadLedger} className="px-3 py-1 rounded bg-purple/20 text-xs font-semibold" style={{ color: "hsl(var(--purple))" }}>Apply</button>
            <div className="ml-auto text-xs text-muted-foreground self-center">Showing {ledger.length} of {ledgerTotal}</div>
          </div>

          <div className="rounded-xl border border-border overflow-hidden" style={{ background: "hsl(var(--surface-1))" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead style={{ background: "hsl(var(--surface-2))" }}>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Net</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Flow</th>
                    <th className="px-3 py-2">Token</th>
                    <th className="px-3 py-2 text-right">SOL</th>
                    <th className="px-3 py-2 text-right">USD (snap)</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No transactions match your filters.</td></tr>
                  )}
                  {ledger.map(t => (
                    <tr key={t.id} className="border-t border-border hover:bg-surface-2/50">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{new Date(t.occurred_at).toLocaleString()}</td>
                      <td className="px-3 py-2"><NetBadge n={t.network} /></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={typeColor(t.tx_type)}>{t.tx_type}</span></td>
                      <td className="px-3 py-2 text-muted-foreground">{t.source} → {t.destination}</td>
                      <td className="px-3 py-2 font-mono">
                        {t.token_symbol ? (
                          <button onClick={() => openTokenDetail(t.token_address!, t.token_symbol!)} className="hover:underline">{t.token_symbol}</button>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{Number(t.amount_sol).toFixed(6)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{t.amount_usd_at_time ? `$${Number(t.amount_usd_at_time).toFixed(2)}` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground max-w-xs truncate" title={t.notes ?? ""}>{t.notes ?? ""}</td>
                      <td className="px-3 py-2">
                        {t.tx_signature && (
                          <a href={explorerUrl(t.tx_signature, t.network)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-cyan hover:underline">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ACCOUNTS */}
      {view === "accounts" && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "hsl(var(--surface-1))" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: "hsl(var(--surface-2))" }}>
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Scope</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                  <th className="px-3 py-2 text-right">Total In</th>
                  <th className="px-3 py-2 text-right">Total Out</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No accounts yet.</td></tr>
                )}
                {accounts.map(a => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{a.account_type}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.scope_label || a.scope_token_address || a.scope_user_id || "Global"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{Number(a.balance_sol).toFixed(4)} SOL</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(a.total_in_sol).toFixed(4)}</td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">{Number(a.total_out_sol).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {view === "settings" && (
        <div className="space-y-3 max-w-md">
          <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "hsl(var(--surface-1))" }}>
            <div>
              <div className="text-sm font-semibold">PMM Platform Launch Fee</div>
              <p className="text-[11px] text-muted-foreground">
                SOL charged per token launch on <strong>mainnet</strong> (separate from gas + liquidity).
                Set to 0 to disable. Devnet launches are never charged this fee.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" step="0.001" value={launchFee}
                onChange={e => setLaunchFee(e.target.value)}
                className="bg-surface-2 border border-border rounded px-2 py-1.5 text-sm font-mono w-32" />
              <span className="text-xs text-muted-foreground">SOL</span>
              <button onClick={saveLaunchFee} disabled={busy === "fee"}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))" }}>
                {busy === "fee" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token detail modal */}
      {tokenDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTokenDetail(null)}>
          <div className="bg-background border border-border rounded-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <div className="text-sm font-bold">{tokenDetail.symbol} — Full audit trail</div>
                <div className="text-[10px] font-mono text-muted-foreground">{tokenDetail.addr}</div>
              </div>
              <button onClick={() => setTokenDetail(null)} className="p-1 hover:bg-surface-2 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: "hsl(var(--surface-2))" }}>
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Net</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Flow</th>
                    <th className="px-3 py-2 text-right">SOL</th>
                    <th className="px-3 py-2 text-right">USD</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenDetail.rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No transactions for this token.</td></tr>
                  )}
                  {tokenDetail.rows.map(t => (
                    <tr key={t.id} className="border-t border-border hover:bg-surface-2/50">
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{new Date(t.occurred_at).toLocaleString()}</td>
                      <td className="px-3 py-2"><NetBadge n={t.network} /></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded text-[10px] font-bold" style={typeColor(t.tx_type)}>{t.tx_type}</span></td>
                      <td className="px-3 py-2 text-muted-foreground">{t.source} → {t.destination}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(t.amount_sol).toFixed(6)}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{t.amount_usd_at_time ? `$${Number(t.amount_usd_at_time).toFixed(2)}` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.notes ?? ""}</td>
                      <td className="px-3 py-2">
                        {t.tx_signature && (
                          <a href={explorerUrl(t.tx_signature, t.network)} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyan hover:underline">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border bg-surface-1 text-xs text-muted-foreground">
              {tokenDetail.rows.length} transactions · Total user spent:{" "}
              <span className="text-foreground font-mono">
                {tokenDetail.rows.filter(r => ["promotion_fee","launch_fee","liquidity","gas_fee","mint_creation","metadata_pin","lp_lock","authority_revoke","indexer_submission"].includes(r.tx_type))
                  .reduce((s, r) => s + Number(r.amount_sol), 0).toFixed(4)} SOL
              </span>
              {" · PMM revenue: "}
              <span className="font-mono" style={{ color: "hsl(var(--purple))" }}>
                {tokenDetail.rows.filter(r => ["promotion_fee","launch_fee"].includes(r.tx_type))
                  .reduce((s, r) => s + Number(r.amount_sol), 0).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KCard({ label, sol, usd, accent }: { label: string; sol: number; usd: string; accent?: string }) {
  const color = accent === "purple" ? "hsl(var(--purple))"
    : accent === "cyan" ? "hsl(var(--cyan))"
    : accent === "green" ? "hsl(142 70% 50%)"
    : accent === "yellow" ? "hsl(45 90% 55%)"
    : "hsl(var(--foreground))";
  return (
    <div className="rounded-xl border p-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="mt-1 text-xl font-bold font-mono" style={{ color }}>{sol.toFixed(4)} SOL</div>
      <div className="text-xs text-muted-foreground font-mono">{usd}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</span>
      {children}
    </div>
  );
}

function NetBadge({ n }: { n: string | null }) {
  if (!n) return <span className="text-[10px] text-muted-foreground">—</span>;
  const isMain = n === "mainnet";
  const color = isMain ? "hsl(142 70% 50%)" : "hsl(45 90% 55%)";
  return (
    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
      style={{ background: `${color.replace(")", " / 0.18)")}`, color, border: `1px solid ${color.replace(")", " / 0.3)")}` }}>
      {isMain ? "MAIN" : "DEV"}
    </span>
  );
}

function typeColor(t: string): React.CSSProperties {
  const map: Record<string, string> = {
    promotion_fee: "hsl(var(--purple))",
    launch_fee: "hsl(var(--cyan))",
    gas_fee: "hsl(var(--muted-foreground))",
    mint_creation: "hsl(200 60% 50%)",
    metadata_pin: "hsl(180 60% 50%)",
    liquidity: "hsl(200 80% 55%)",
    lp_lock: "hsl(220 70% 60%)",
    authority_revoke: "hsl(0 65% 55%)",
    indexer_submission: "hsl(160 60% 50%)",
    partner_commission: "hsl(45 90% 55%)",
    partner_payout: "hsl(142 70% 50%)",
    trading_fee: "hsl(280 70% 60%)",
  };
  const c = map[t] ?? "hsl(var(--foreground))";
  return { background: `${c.replace(")", " / 0.18)")}`, color: c, border: `1px solid ${c.replace(")", " / 0.3)")}` };
}
