import { Link } from "react-router-dom";
import logoIcon from "@/assets/logo-icon.png";
import { Twitter, Send, ChevronRight } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
  showCTABanner?: boolean;
}

const POPULAR_TOKENS = ["bonk", "wif", "pepe", "popcat", "fartcoin", "moodeng", "ai16z", "trump"];

export default function PageLayout({ children, showCTABanner = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* CTA Banner */}
      {showCTABanner && (
        <div className="bg-gradient-to-r from-primary/20 to-secondary/10 border-b border-border py-2 px-4 text-center text-sm">
          <span className="text-muted-foreground">🔥 </span>
          <span className="font-medium">Get real buyers for your memecoin in minutes</span>
          <Link to="/" className="ml-2 text-primary hover:underline inline-flex items-center gap-1">
            Start Free <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {children}

      {/* Footer */}
      <footer className="mt-24 border-t border-border bg-surface-1/95 backdrop-blur-sm">
        {/* Main Footer Grid */}
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-16 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={logoIcon} alt="PromoteMyMemes" className="h-7 w-7 object-contain" />
              <span className="font-bold">Promote<span className="gradient-text-purple">MyMemes</span></span>
            </div>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Launch, audit and promote Solana memecoins. One signature deploy, on-chain Metaplex metadata, LP locking and AI promotion across Telegram, X, Discord, Instagram & Reddit.
            </p>
            <div className="flex gap-2">
              <a href="https://twitter.com/PromoteMyMemes" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors border border-border">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://t.me/PromoteMyMemes" target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors border border-border">
                <Send className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</h4>
            <ul className="space-y-2 text-xs">
              {[
                { to: "/launch-token", label: "🚀 Launch Token" },
                { to: "/audit-token", label: "🛡️ Audit Token" },
                { to: "/token-tools/metadata", label: "🖼️ Metadata Tool" },
                { to: "/token-tools/liquidity", label: "💧 Liquidity Pool" },
                { to: "/token-tools/indexers", label: "📡 Submit to Indexers" },
                { to: "/memecoin-promotion", label: "📣 Memecoin Promotion" },
              ].map(l => (
                <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Discover */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Discover</h4>
            <ul className="space-y-2 text-xs">
              {[
                { to: "/top-promoted-tokens", label: "🔥 Trending Memecoins" },
                { to: "/top-promoted-tokens", label: "🏆 Leaderboard" },
                { to: "/recently-added-tokens", label: "⚡ New Tokens" },
                { to: "/top-solana-memecoins", label: "Top Solana Memecoins" },
                { to: "/top-pumpfun-memecoins", label: "Top Pump.fun Tokens" },
                { to: "/top-new-memecoins", label: "Top New Memecoins" },
              ].map(l => (
                <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Grow & Community */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grow</h4>
            <ul className="space-y-2 text-xs">
              {[
                { to: "/ai-promo", label: "🧠 AI Promo Studio" },
                { to: "/campaign-engine", label: "🎯 Campaign Engine" },
                { to: "/viral-loop", label: "🔄 Viral Loop" },
                { to: "/community", label: "🌐 Community Hub" },
                { to: "/partner/apply", label: "👑 Earn as Partner" },
                { to: "/blog", label: "📖 Blog & Guides" },
              ].map(l => (
                <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} PromoteMyMemes. All rights reserved. | Crypto trading involves risk. DYOR.</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/launch-token" className="hover:text-foreground transition-colors">Launch</Link>
              <Link to="/audit-token" className="hover:text-foreground transition-colors">Audit</Link>
              <Link to="/community" className="hover:text-foreground transition-colors">Community</Link>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <Link to="/top-promoted-tokens" className="hover:text-foreground transition-colors">Trending</Link>
              <Link to="/recently-added-tokens" className="hover:text-foreground transition-colors">New Tokens</Link>
              <Link to="/partner/apply" className="hover:text-foreground transition-colors">Earn</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
