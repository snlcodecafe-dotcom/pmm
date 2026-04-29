import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket, Users, ArrowRight, TrendingUp, Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import PageLayout from "@/components/PageLayout";

export default function Onboarding() {
  const nav = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/auth?next=/onboarding"); return; }
    // Wait for profile to load before deciding route — avoids flicker / wrong redirect
    if (profile === null) return;
    if (profile?.onboarding_completed) {
      nav(profile.primary_role === "partner" ? "/partner/dashboard" : "/dashboard");
    }
  }, [user, profile, loading, nav]);

  async function pick(role: "token_owner" | "partner") {
    if (!user) return;
    if (role === "token_owner") {
      await supabase.from("profiles").update({ primary_role: "token_owner", onboarding_completed: true }).eq("user_id", user.id);
      nav("/dashboard");
    } else {
      await supabase.from("profiles").update({ primary_role: "partner" }).eq("user_id", user.id);
      nav("/partner/apply");
    }
  }

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black mb-3" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Welcome aboard
          </h1>
          <p className="text-muted-foreground">Pick how you want to use PromoteMyMemes. You can request the other role later from your profile.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => pick("token_owner")}
            className="group rounded-2xl border-2 p-6 text-left transition-all hover:scale-[1.02]"
            style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--purple) / 0.4)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--purple) / 0.2)" }}>
                <Coins className="w-6 h-6" style={{ color: "hsl(var(--purple))" }} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Token Owner</h3>
                <div className="text-xs text-muted-foreground">Launch & promote your memecoin</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Create a Solana SPL token in minutes</li>
              <li>• Add liquidity & lock LP automatically</li>
              <li>• Run paid promotion campaigns</li>
              <li>• Track views, clicks, and conversions</li>
            </ul>
            <div className="flex items-center gap-1 font-bold text-sm" style={{ color: "hsl(var(--purple))" }}>
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          <button onClick={() => pick("partner")}
            className="group rounded-2xl border-2 p-6 text-left transition-all hover:scale-[1.02]"
            style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--cyan) / 0.4)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--cyan) / 0.2)" }}>
                <Users className="w-6 h-6" style={{ color: "hsl(var(--cyan))" }} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Promotion Partner</h3>
                <div className="text-xs text-muted-foreground">Earn by promoting tokens to your audience</div>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li>• Earn up to <span className="font-bold text-foreground">10% commission</span> on referred promotions</li>
              <li>• Bring your Telegram / Discord audience</li>
              <li>• Auto-tier upgrades as you grow</li>
              <li>• Real-time earnings dashboard</li>
            </ul>
            <div className="flex items-center gap-1 font-bold text-sm" style={{ color: "hsl(var(--cyan))" }}>
              Apply as partner <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3 inline mr-1" />
          Join 1,200+ creators already growing on PromoteMyMemes
        </div>
      </div>
    </PageLayout>
  );
}
