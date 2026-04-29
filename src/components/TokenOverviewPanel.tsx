import { ExternalLink, Globe, Twitter, Send, MessageCircle, Copy, ShieldAlert, ShieldCheck, Coins, Activity, Droplets, Users, Clock, BarChart3, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = { report: any };

function fmtUsd(n: number | null | undefined, digits = 2) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "$" + (n / 1_000).toFixed(2) + "K";
  if (Math.abs(n) < 0.01 && n !== 0) return "$" + n.toExponential(2);
  return "$" + n.toFixed(digits);
}
function fmtNum(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
function pctClass(n: number | null | undefined) {
  if (n == null) return "text-muted-foreground";
  if (n > 0) return "text-emerald-500";
  if (n < 0) return "text-rose-500";
  return "text-muted-foreground";
}
function shortAddr(a: string) { return a.slice(0, 4) + "…" + a.slice(-4); }
async function copy(s: string) { try { await navigator.clipboard.writeText(s); toast.success("Copied"); } catch { /* */ } }

export default function TokenOverviewPanel({ report }: Props) {
  const o = report.overview;
  if (!o) return null;
  const id = o.identity;
  const m = o.market;
  const s = o.socials;

  return (
    <Card className="app-panel rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">Token Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identity row */}
        <div className="flex flex-wrap items-start gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted flex items-center justify-center">
            {id.logo ? (
              <img
                src={id.logo}
                alt={id.symbol ?? ""}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  // Fallback to letter avatar if image fails (e.g. DexScreener CDN hotlink block)
                  const parent = img.parentElement;
                  if (parent) {
                    const letter = (id.symbol || id.name || "?").trim().charAt(0).toUpperCase();
                    parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-accent/30 text-lg font-bold text-foreground">${letter}</div>`;
                  }
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{id.name ?? "Unknown"}</h2>
              {id.symbol && <Badge variant="secondary" className="font-mono">${id.symbol}</Badge>}
              <Badge variant="outline" className="text-[10px] uppercase">{id.metadataSource}</Badge>
              <Badge variant="outline" className="text-[10px]">{report.network}</Badge>
            </div>
            {id.description && <p className="text-xs leading-5 text-muted-foreground line-clamp-2">{id.description}</p>}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {s.website && <SocialLink href={s.website} icon={<Globe className="h-3.5 w-3.5" />} label="Website" />}
              {s.twitter && <SocialLink href={s.twitter} icon={<Twitter className="h-3.5 w-3.5" />} label="Twitter" />}
              {s.telegram && <SocialLink href={s.telegram} icon={<Send className="h-3.5 w-3.5" />} label="Telegram" />}
              {s.discord && <SocialLink href={s.discord} icon={<MessageCircle className="h-3.5 w-3.5" />} label="Discord" />}
              {!s.website && !s.twitter && !s.telegram && !s.discord && (
                <span className="text-[11px] text-muted-foreground">No socials linked</span>
              )}
            </div>
          </div>
        </div>

        {/* Market stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Price" value={fmtUsd(m.priceUsd, 6)} icon={<Coins className="h-3.5 w-3.5" />} />
          <Stat label="Market Cap" value={fmtUsd(m.marketCap)} icon={<BarChart3 className="h-3.5 w-3.5" />} />
          <Stat label="FDV" value={fmtUsd(m.fdv)} icon={<BarChart3 className="h-3.5 w-3.5" />} />
          <Stat label="Liquidity" value={fmtUsd(m.liquidityUsd)} icon={<Droplets className="h-3.5 w-3.5" />} />
        </div>

        {/* Price change & volume */}
        <div className="grid gap-3 md:grid-cols-2">
          <Panel title="Price Change">
            <div className="grid grid-cols-4 gap-2 text-center">
              {(["m5", "h1", "h6", "h24"] as const).map((k) => (
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className={`text-sm font-semibold ${pctClass(m.priceChange[k])}`}>{fmtPct(m.priceChange[k])}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Volume">
            <div className="grid grid-cols-4 gap-2 text-center">
              {(["m5", "h1", "h6", "h24"] as const).map((k) => (
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                  <div className="text-sm font-semibold">{fmtUsd(m.volume[k])}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Activity & age */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="24h Buys" value={String(m.txns24h.buys)} icon={<Activity className="h-3.5 w-3.5 text-emerald-500" />} />
          <Stat label="24h Sells" value={String(m.txns24h.sells)} icon={<Activity className="h-3.5 w-3.5 text-rose-500" />} />
          <Stat label="Pair Age" value={m.ageDays != null ? `${m.ageDays}d` : "—"} icon={<Clock className="h-3.5 w-3.5" />} />
          <Stat label="Holders Sample" value={String(o.topHolders.length)} icon={<Users className="h-3.5 w-3.5" />} />
        </div>

        {/* On-chain identity */}
        <Panel title="On-chain Identity">
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <KV k="Mint Address" v={report.mint} mono copyable />
            <KV k="Decimals" v={id.decimals != null ? String(id.decimals) : "—"} />
            <KV k="Total Supply" v={id.supplyUi != null ? fmtNum(id.supplyUi) : "—"} />
            <KV
              k="Mint Authority"
              v={id.mintAuthority ? shortAddr(id.mintAuthority) : "Revoked ✓"}
              mono={!!id.mintAuthority}
              tone={id.mintAuthority ? "warn" : "good"}
              copyable={!!id.mintAuthority}
              fullValue={id.mintAuthority ?? undefined}
            />
            <KV
              k="Freeze Authority"
              v={id.freezeAuthority ? shortAddr(id.freezeAuthority) : "Revoked ✓"}
              mono={!!id.freezeAuthority}
              tone={id.freezeAuthority ? "warn" : "good"}
              copyable={!!id.freezeAuthority}
              fullValue={id.freezeAuthority ?? undefined}
            />
            <KV
              k="Pair Created"
              v={m.pairCreatedAt ? new Date(m.pairCreatedAt).toLocaleString() : "—"}
            />
          </div>
          {(id.mintAuthority || id.freezeAuthority) ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>One or more authorities are still active — DEX listings and serious buyers may skip this token.</span>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Both authorities are revoked — supply is fixed and accounts cannot be frozen.</span>
            </div>
          )}
        </Panel>

        {/* Liquidity pools */}
        {o.pools.length > 0 && (
          <Panel title={`Liquidity Pools (${o.pools.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-3">DEX</th>
                    <th className="text-left pr-3">Pair</th>
                    <th className="text-right pr-3">Price</th>
                    <th className="text-right pr-3">Liquidity</th>
                    <th className="text-right pr-3">24h Vol</th>
                    <th className="text-right">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {o.pools.map((p: any) => (
                    <tr key={p.pairAddress} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-3 font-medium capitalize">{p.dex}</td>
                      <td className="pr-3 text-muted-foreground">{id.symbol}/{p.quoteSymbol}</td>
                      <td className="pr-3 text-right">{fmtUsd(p.priceUsd, 6)}</td>
                      <td className="pr-3 text-right">{fmtUsd(p.liquidityUsd)}</td>
                      <td className="pr-3 text-right">{fmtUsd(p.volume24h)}</td>
                      <td className="text-right">
                        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline"><ExternalLink className="h-3 w-3" /></a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Top holders */}
        {o.topHolders.length > 0 && (
          <Panel title="Top 10 Holders">
            <div className="space-y-1.5">
              {o.topHolders.map((h: any, i: number) => (
                <div key={h.address} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-muted-foreground">#{i + 1}</span>
                  <button onClick={() => copy(h.address)} className="font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    {shortAddr(h.address)} <Copy className="h-3 w-3" />
                  </button>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${h.pct > 20 ? "bg-rose-500" : h.pct > 10 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: Math.min(100, h.pct) + "%" }} />
                  </div>
                  <span className="w-16 text-right font-medium">{h.pct.toFixed(2)}%</span>
                  <span className="w-20 text-right text-muted-foreground hidden sm:inline">{fmtNum(h.uiAmount)}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Indexing & explorers */}
        <Panel title="Indexing & Explorers">
          <div className="flex flex-wrap gap-2 mb-3">
            <IndexerPill label="DexScreener" ok={o.indexers.dexscreener} />
            <IndexerPill label="Jupiter" ok={o.indexers.jupiter} />
            <IndexerPill label="Birdeye" ok={o.indexers.birdeye} />
          </div>
          <div className="flex flex-wrap gap-2">
            <ExtLink href={o.links.dexscreener} label="DexScreener" />
            <ExtLink href={o.links.birdeye} label="Birdeye" />
            <ExtLink href={o.links.jupiter} label="Jupiter Swap" />
            <ExtLink href={o.links.solscan} label="Solscan" />
            <ExtLink href={o.links.explorer} label="Solana Explorer" />
          </div>
        </Panel>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3.5">
      <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
function KV({ k, v, mono, tone, copyable, fullValue }: { k: string; v: string; mono?: boolean; tone?: "good" | "warn"; copyable?: boolean; fullValue?: string }) {
  const toneClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "";
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className={`flex items-center gap-1.5 ${mono ? "font-mono" : ""} ${toneClass}`}>
        {v}
        {copyable && (
          <button onClick={() => copy(fullValue ?? v)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
        )}
      </span>
    </div>
  );
}
function SocialLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] hover:bg-accent/10">
      {icon}{label}
    </a>
  );
}
function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] hover:bg-accent/10">
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}
function IndexerPill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" : "border-rose-500/40 bg-rose-500/10 text-rose-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
      {label}: {ok ? "Listed" : "Not Found"}
    </span>
  );
}
