import { Link, useLocation } from "react-router-dom";
import { Users, Rocket, Crown, LayoutDashboard, Megaphone, Sparkles, Repeat2, Trophy, BookOpen, Target } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { AccountMenu } from "./AccountMenu";
import { useAuth } from "@/hooks/useAuth";

// Public links — visible to everyone (guests only see these)
const PUBLIC_LINKS = [
  { to: "/memecoin-promotion", label: "Promote", icon: Megaphone },
  { to: "/top-promoted-tokens", label: "Leaderboard", icon: Trophy },
  { to: "/partner/apply", label: "Earn", icon: Crown },
  { to: "/blog", label: "Blog", icon: BookOpen },
];

// Full ordered nav for signed-in users:
// Dashboard, My Tokens, Launch, Campaigns, Leaderboard, Community, Earn
const AUTH_NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/launch-token", label: "Launch", icon: Rocket },
  { to: "/campaign-engine", label: "Campaigns", icon: Target },
  { to: "/ai-promo", label: "AI Promo", icon: Sparkles },
  { to: "/community", label: "Community", icon: Users },
  { to: "/viral-loop", label: "Viral Loop", icon: Repeat2 },
  { to: "/partner/apply", label: "Earn", icon: Crown },
];

interface MainNavProps {
  rightContent?: React.ReactNode;
}

export default function MainNav({ rightContent }: MainNavProps) {
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = user ? AUTH_NAV_LINKS : PUBLIC_LINKS;

  return (
    <>
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b bg-background/90 backdrop-blur-xl"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src={logoIcon} alt="PromoteMyMemes logo" className="w-9 h-9 object-contain" />
          <span className="font-black text-lg tracking-tight">
            Promote<span style={{ background: "linear-gradient(90deg, hsl(var(--purple)), hsl(var(--cyan)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>MyMemes</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-accent/40 hover:text-foreground"
                style={isActive ? { color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.12)" } : undefined}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side — wallet + account menu */}
        <div className="flex items-center gap-2">
          {rightContent}
          <AccountMenu />
        </div>
      </div>

      {/* Mobile sub-nav */}
      <div className="lg:hidden overflow-x-auto border-t bg-surface-1 scrollbar-hide" style={{ borderColor: "hsl(var(--border) / 0.4)" }}>
        <div className="flex items-center gap-1 px-3 py-2 whitespace-nowrap text-xs leading-none">
          {navLinks.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full px-3 py-1.5 transition-colors text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                style={isActive ? { color: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.12)" } : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
    {/* Reserved spacer so pages don't need manual top padding for the fixed nav.
        Mobile uses the full rendered nav + sub-nav height (97px); desktop is the main bar only (56px). */}
    <div aria-hidden className="block lg:hidden" style={{ height: 105 }} />
    <div aria-hidden className="hidden lg:block" style={{ height: 64 }} />
    </>
  );
}
