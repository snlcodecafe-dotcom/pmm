import { Link, useNavigate } from "react-router-dom";
import { User as UserIcon, LogOut, Crown, LayoutDashboard, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WalletConnectButton } from "./WalletConnectButton";

export function AccountMenu() {
  const { user, profile, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <WalletConnectButton />
        <Link to="/auth"
          className="hidden sm:inline-flex items-center gap-1 px-3 h-[34px] rounded-lg text-xs font-bold border transition-all"
          style={{ borderColor: "hsl(var(--purple) / 0.4)", color: "hsl(var(--purple))" }}>
          <UserIcon className="w-3.5 h-3.5" /> Sign in
        </Link>
      </div>
    );
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2" ref={ref}>
      <WalletConnectButton />
      <div className="relative">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 h-[34px] px-2 rounded-lg border text-xs font-bold transition-all"
          style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))", color: "white" }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : initial}
          </div>
          <span className="hidden sm:inline truncate max-w-[100px]">{displayName}</span>
        </button>
        {open && (
          <div className="absolute right-0 top-[42px] w-56 rounded-xl border shadow-2xl overflow-hidden"
            style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
            <div className="px-3 py-2 border-b text-[11px] text-muted-foreground truncate" style={{ borderColor: "hsl(var(--border))" }}>
              {user.email} {isAdmin && <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "hsl(var(--purple) / 0.2)", color: "hsl(var(--purple))" }}>ADMIN</span>}
            </div>
            <Link to="/partner/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition">
              <Crown className="w-3.5 h-3.5" /> Partner Dashboard
            </Link>
            <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition">
              <UserIcon className="w-3.5 h-3.5" /> Profile & Wallets
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition" style={{ color: "hsl(var(--purple))" }}>
                <Shield className="w-3.5 h-3.5" /> Admin Panel
              </Link>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); setOpen(false); navigate("/"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-2 transition text-left text-destructive">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
