import { Link, useLocation } from "react-router-dom";
import { Home, Search, Rocket, ArrowLeft } from "lucide-react";
import PageLayout from "@/components/PageLayout";

const SUGGESTIONS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/launch-token", label: "Launch a token", icon: Rocket },
  { to: "/top-promoted-tokens", label: "Leaderboard", icon: Search },
];

export default function NotFound() {
  const location = useLocation();
  return (
    <PageLayout>
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-lg">
          <div
            className="text-7xl sm:text-8xl font-black mb-3"
            style={{
              background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            404
          </div>
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-sm text-muted-foreground mb-2">
            The page <code className="px-1.5 py-0.5 rounded text-[11px]" style={{ background: "hsl(var(--surface-2))" }}>{location.pathname}</code> doesn't exist or has moved.
          </p>
          <p className="text-xs text-muted-foreground mb-8">Try one of these instead:</p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {SUGGESTIONS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-bold border transition-all hover:scale-[1.03]"
                style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--purple) / 0.4)", color: "hsl(var(--foreground))" }}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Go back
          </button>
        </div>
      </main>
    </PageLayout>
  );
}
