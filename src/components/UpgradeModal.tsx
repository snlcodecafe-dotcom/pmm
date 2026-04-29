import { PlanKey, PLAN_CONFIG, minPlanForFeature, FeatureName, FEATURE_LABELS } from "@/lib/planConfig";
import { Zap, X } from "lucide-react";
import { Link } from "react-router-dom";

interface UpgradeModalProps {
  feature: FeatureName;
  onClose: () => void;
}

export default function UpgradeModal({ feature, onClose }: UpgradeModalProps) {
  const requiredPlan = minPlanForFeature(feature);
  const plan = PLAN_CONFIG[requiredPlan];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(8px)" }} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 border"
        style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h3 className="font-black text-xl mb-2">Upgrade to {plan.name}</h3>
          <p className="text-sm text-muted-foreground">
            <strong style={{ color: "hsl(var(--cyan))" }}>{FEATURE_LABELS[feature]}</strong> requires the {plan.name} plan ({plan.price}).
          </p>
        </div>

        {/* Plan comparison */}
        <div className="space-y-4 mb-6">
          {(["starter", "pro", "ultra"] as PlanKey[]).map(pk => {
            const p = PLAN_CONFIG[pk];
            const isRequired = pk === requiredPlan;
            return (
              <div
                key={pk}
                className="rounded-xl p-4 border transition-all"
                style={{
                  borderColor: isRequired ? "hsl(var(--purple) / 0.6)" : "hsl(var(--border))",
                  background: isRequired ? "hsl(var(--purple) / 0.08)" : "hsl(var(--surface-2))",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-sm font-black" style={{ color: isRequired ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))" }}>
                    {p.price}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(Object.entries(p.features) as [FeatureName, unknown][])
                    .filter(([, v]) => v !== false)
                    .slice(0, 5)
                    .map(([key]) => (
                      <span key={key} className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: "hsl(var(--surface-3))", color: "hsl(var(--muted-foreground))" }}>
                        {FEATURE_LABELS[key]}
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        <Link
          to="/"
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))", boxShadow: "0 0 24px hsl(var(--purple) / 0.3)" }}
        >
          <Zap className="w-4 h-4" /> Upgrade to {plan.name} — {plan.price}
        </Link>
      </div>
    </div>
  );
}
