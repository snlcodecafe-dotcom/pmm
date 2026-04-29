import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Zap, Plus } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

type TokenRow = { id: string; token_symbol: string | null; token_name: string | null; created_at: string; promotion_type: string; status: string; views: number | null };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

export default function RecentlyAddedTokens() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("token_submissions")
        .select("id, token_symbol, token_name, created_at, promotion_type, status, views")
        .order("created_at", { ascending: false })
        .limit(50);
      setTokens(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const tierBadge = (type: string) => {
    if (type === "premium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    if (type === "advanced") return "bg-primary/10 text-primary border-primary/20";
    return "bg-surface-2 text-muted-foreground border-border";
  };

  return (
    <PageLayout>
      <SEOHead
        title="Recently Added Memecoins — New Token Listings"
        description="Browse memecoins recently added to PromoteMyMemes. Find newly launched Solana tokens before they trend. Updated in real-time as new tokens are submitted for promotion."
        canonical="/recently-added-tokens"
        keywords="recently added memecoins, new crypto tokens, new solana memecoins, latest memecoin listings, freshly launched tokens"
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm mb-6">
            <Clock className="h-3.5 w-3.5" /> Live Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Recently Added<br />
            <span className="gradient-text-purple">Memecoins</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Freshly submitted tokens for promotion on PromoteMyMemes. Find new memecoins before they trend.
          </p>
        </section>

        {/* Token Feed */}
        <section className="mb-12">
          {loading ? (
            <div className="text-center py-20">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading latest tokens...</p>
            </div>
          ) : tokens.length === 0 ? (
            <div className="text-center py-20 card-glass rounded-xl border border-border">
              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-3">No Tokens Yet</h2>
              <p className="text-muted-foreground mb-6">Be the first to add your memecoin to our platform!</p>
              <Link to="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
                Submit Your Token
              </Link>
            </div>
          ) : (
            <div className="card-glass rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-5 bg-surface-2 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">Token</div>
                <div className="text-center">Tier</div>
                <div className="text-center">Added</div>
                <div className="text-center">Action</div>
              </div>
              {tokens.map(t => (
                <div key={t.id} className="grid grid-cols-5 px-4 py-4 border-t border-border items-center hover:bg-surface-2 transition-colors">
                  <div className="col-span-2">
                    <Link to={`/token/${(t.token_symbol || "").toLowerCase()}`} className="flex items-center gap-3 group">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {(t.token_symbol || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors text-sm">{t.token_symbol || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{t.token_name || "Solana Token"}</p>
                      </div>
                    </Link>
                  </div>
                  <div className="text-center">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${tierBadge(t.promotion_type)}`}>
                      {t.promotion_type}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(t.created_at)}
                    </span>
                  </div>
                  <div className="text-center">
                    <Link to="/" className="text-xs text-primary hover:underline font-medium">Promote →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEO Content */}
        <section className="mb-12 card-glass rounded-xl border border-border p-8">
          <h2 className="text-2xl font-bold mb-4">Why Discover Memecoins Early?</h2>
          <div className="grid md:grid-cols-2 gap-6 text-muted-foreground text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">First-Mover Advantage</h3>
              <p>The biggest gains in memecoins come from finding them early — before they trend on Twitter or get listed on major aggregators. PromoteMyMemes shows you tokens the moment they launch.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Vetted for Basic Quality</h3>
              <p>All tokens on PromoteMyMemes have submitted for promotion — meaning there's a real team behind each one. This filters out completely abandoned projects.</p>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Explore More</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { to: "/top-promoted-tokens", label: "Trending Now", desc: "See what's trending today" },
              { to: "/top-promoted-tokens", label: "Top Tokens", desc: "Leaderboard rankings" },
              { to: "/", label: "Promote Your Token", desc: "Get your token listed" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 transition-colors group">
                <h3 className="font-semibold group-hover:text-primary transition-colors">{l.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3">{l.desc}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
