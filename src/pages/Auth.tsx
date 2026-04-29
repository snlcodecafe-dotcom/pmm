import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User as UserIcon, AlertCircle } from "lucide-react";

const emailSchema = z.string().trim().email({ message: "Invalid email" }).max(255);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);
const nameSchema = z.string().trim().min(1, "Required").max(50);

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState (""); const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [info, setInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const refCode = params.get("ref");
  const next = params.get("next");

  // Persist referral code so it survives email-confirmation redirect
  useEffect(() => {
    if (refCode) localStorage.setItem("pm_ref_code", refCode);
  }, [refCode]);

  useEffect(() => {
    const route = async (uid: string) => {
      const { data: prof } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", uid).maybeSingle();
      if (!prof?.onboarding_completed) navigate("/onboarding");
      else navigate(next || "/dashboard");
    };
    // Listen for sign-in events first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) setTimeout(() => void route(session.user.id), 0);
    });
    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) void route(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, [navigate, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null); setBusy(true);
    try {
      const e1 = emailSchema.safeParse(email); if (!e1.success) throw new Error(e1.error.errors[0].message);
      if (mode !== "forgot") {
        const p1 = passwordSchema.safeParse(password); if (!p1.success) throw new Error(p1.error.errors[0].message);
      }
      if (mode === "signup") {
        const n1 = nameSchema.safeParse(displayName); if (!n1.success) throw new Error(n1.error.errors[0].message);
        const { error: err } = await supabase.auth.signUp({
          email: e1.data, password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { display_name: n1.data, referral_code: refCode || undefined } },
        });
        if (err) throw err;
        setInfo("Account created! Check your email to verify, then sign in.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({ email: e1.data, password });
        if (err) throw err;
        // Post-signin routing handled by getSession effect
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(e1.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (err) throw err;
        setInfo("Password reset link sent! Check your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      
      <main className="container max-w-md pt-6 pb-16 px-4">
        <div className="rounded-2xl border p-6 sm:p-8" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <h1 className="text-2xl font-black mb-1">{mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
          <p className="text-xs text-muted-foreground mb-6">
            {mode === "signup" ? "Track your launches, promotions and wallets in one place." : mode === "forgot" ? "We'll email you a link to reset." : "Sign in to manage your tokens."}
          </p>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Field icon={<UserIcon className="w-3.5 h-3.5" />} label="Display name" type="text" value={displayName} onChange={setDisplayName} placeholder="Satoshi" />
            )}
            <Field icon={<Mail className="w-3.5 h-3.5" />} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            {mode !== "forgot" && (
              <Field icon={<Lock className="w-3.5 h-3.5" />} label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" />
            )}
            {error && <div className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}</div>}
            {info && <div className="text-xs p-2 rounded" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))" }}>{info}</div>}

            <button type="submit" disabled={busy}
              className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.85))" }}>
              {busy ? "..." : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-xs text-center text-muted-foreground space-y-1">
            {mode === "signin" && <>
              <button onClick={() => { setMode("forgot"); setError(null); }} className="underline hover:text-foreground">Forgot password?</button>
              <div>No account? <button onClick={() => { setMode("signup"); setError(null); }} className="font-bold text-purple hover:underline" style={{ color: "hsl(var(--purple))" }}>Sign up</button></div>
            </>}
            {mode === "signup" && <div>Have an account? <button onClick={() => { setMode("signin"); setError(null); }} className="font-bold" style={{ color: "hsl(var(--purple))" }}>Sign in</button></div>}
            {mode === "forgot" && <button onClick={() => { setMode("signin"); setError(null); }} className="underline hover:text-foreground">Back to sign in</button>}
          </div>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-4">By signing up you agree to use this platform at your own risk. No financial advice.</p>
        <p className="text-[10px] text-center text-muted-foreground mt-2">
          <Link to="/" className="underline">← back to home</Link>
        </p>
      </main>
    </div>
  );
}

function Field({ icon, label, type, value, onChange, placeholder }: { icon: React.ReactNode; label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string; }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 mb-1">{icon} {label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none border transition-colors"
        style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
    </div>
  );
}
