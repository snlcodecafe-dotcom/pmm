import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AccountMenu } from "@/components/AccountMenu";
import { Lock, AlertCircle, Check } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase populates the session from the recovery token in the URL hash automatically.
    const sub = supabase.auth.onAuthStateChange((evt) => { if (evt === "PASSWORD_RECOVERY") setError(null); });
    return () => sub.data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      if (password.length < 8) throw new Error("Min 8 characters");
      if (password !== confirm) throw new Error("Passwords don't match");
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      
      <main className="container max-w-md pt-6 pb-16 px-4">
        <div className="rounded-2xl border p-6" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <h1 className="text-2xl font-black mb-4">Set new password</h1>
          {done ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--cyan))" }}>
              <Check className="w-4 h-4" /> Password updated. Redirecting…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password (min 8)"
                className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }} />
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password"
                className="w-full px-3 py-2.5 rounded-lg text-sm border" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }} />
              {error && <div className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5" /> {error}</div>}
              <button type="submit" disabled={busy}
                className="w-full py-2.5 rounded-lg font-bold text-sm text-white"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.85))" }}>
                {busy ? "..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
