import { Link } from "react-router-dom";
import { BookOpen, Clock, ArrowRight, Tag } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { BLOG_POSTS } from "@/lib/blogData";

export default function Blog() {
  return (
    <PageLayout>
      <SEOHead
        title="Crypto & Memecoin Marketing Blog | PromoteMyMemes"
        description="Expert guides on memecoin promotion, crypto marketing strategies, pump.fun promotion, and Telegram marketing. Free resources to help grow your token's audience."
        canonical="/blog"
        keywords="memecoin marketing blog, crypto promotion guides, how to promote memecoin, pump.fun marketing tips"
        schema={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "PromoteMyMemes Blog",
          description: "Expert guides on memecoin promotion and crypto marketing",
          url: "https://promotemymemes.com/blog",
          publisher: { "@type": "Organization", name: "PromoteMyMemes" },
        }}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
            <BookOpen className="h-3.5 w-3.5" /> Crypto Marketing Resources
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Memecoin Promotion<br />
            <span className="gradient-text-purple">Guides & Strategies</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about promoting your memecoin, growing your community, and getting real buyers for your token.
          </p>
        </section>

        {/* Featured Post */}
        <section className="mb-12">
          <Link to={`/blog/${BLOG_POSTS[0].slug}`} className="block card-glass rounded-2xl border border-border overflow-hidden hover:border-primary/40 transition-colors group">
            <div className="p-8 md:p-12">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                  {BLOG_POSTS[0].category}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{BLOG_POSTS[0].readTime}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                {BLOG_POSTS[0].title}
              </h2>
              <p className="text-muted-foreground text-lg mb-6 max-w-3xl">{BLOG_POSTS[0].excerpt}</p>
              <div className="flex items-center gap-2 text-primary font-medium">
                Read Article <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </section>

        {/* All Posts */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">All Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {BLOG_POSTS.slice(1).map(post => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="card-glass rounded-xl border border-border p-6 hover:border-primary/40 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />{post.readTime}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{post.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
                <div className="flex items-center gap-1 text-primary text-sm font-medium">
                  Read More <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Topics */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Browse by Topic</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Memecoin Promotion", to: "/" },
              { label: "Pump.fun Marketing", to: "/promote-pumpfun-token" },
              { label: "Telegram Promotion", to: "/telegram-crypto-promotion" },
              { label: "Crypto Marketing Tools", to: "/crypto-marketing-tool" },
              { label: "Trending Tokens", to: "/top-promoted-tokens" },
              { label: "Token Leaderboard", to: "/top-promoted-tokens" },
            ].map(t => (
              <Link key={t.to} to={t.to} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-2 hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />{t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border">
          <h2 className="text-2xl font-bold mb-3">Ready to Promote Your Memecoin?</h2>
          <p className="text-muted-foreground mb-6">Apply everything you've learned. Start your promotion in under 2 minutes.</p>
          <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            🚀 Start Free Promotion
          </Link>
        </section>
      </main>
    </PageLayout>
  );
}
