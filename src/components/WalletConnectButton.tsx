import { useEffect, useRef, useState } from "react";
import { Wallet, LogOut, Copy, Check, ChevronDown } from "lucide-react";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { toast } from "sonner";

/**
 * Single, production-grade wallet button.
 * Disconnected → "Connect Wallet" (opens adapter modal).
 * Connected   → shows wallet icon + truncated address with a dropdown for copy / disconnect.
 */
export function WalletConnectButton() {
  const { wallet, connect, disconnect } = useSolanaWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!wallet.connected || !wallet.publicKey) {
    return (
      <button
        onClick={() => connect()}
        disabled={wallet.connecting}
        className="inline-flex items-center gap-1.5 h-[34px] px-3.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.85))",
          boxShadow: "0 0 20px hsl(var(--purple) / 0.3)",
        }}
      >
        <Wallet className="w-3.5 h-3.5" />
        {wallet.connecting ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  const addr = wallet.publicKey;
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;

  async function copyAddr() {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-xs font-bold border transition-all"
        style={{
          background: "hsl(var(--surface-1))",
          borderColor: "hsl(var(--purple) / 0.4)",
          color: "hsl(var(--foreground))",
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "hsl(var(--cyan))", boxShadow: "0 0 8px hsl(var(--cyan))" }}
        />
        <span className="font-mono">{short}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[42px] w-56 rounded-xl border shadow-2xl overflow-hidden z-50"
          style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
              {wallet.walletName ?? "Wallet"}
            </div>
            <div className="text-[11px] font-mono truncate">{addr}</div>
          </div>
          <button
            onClick={copyAddr}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition text-left"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            onClick={async () => { await disconnect(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition text-left text-destructive"
          >
            <LogOut className="w-3.5 h-3.5" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
