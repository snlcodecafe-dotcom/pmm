import { useParams, Link } from "react-router-dom";
import { Clock, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { articleSchema, faqSchema, breadcrumbSchema } from "@/components/SEOHead";
import { getBlogPost, getRelatedPosts } from "@/lib/blogData";

// Internal link injection — auto-links keywords in body content
const INTERNAL_LINKS: Record<string, string> = {
  "memecoin promotion": "/",
  "pump.fun token": "/promote-pumpfun-token",
  "Telegram promotion": "/telegram-crypto-promotion",
  "crypto marketing tool": "/crypto-marketing-tool",
  "trending memecoins": "/top-promoted-tokens",
};

function renderMarkdown(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold mt-12 mb-4 gradient-text-purple">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-surface-2 px-1.5 py-0.5 rounded text-secondary text-sm font-mono">$1</code>')
    .replace(/^---$/gm, '<hr class="border-border my-8" />')
    .replace(/^\| (.+) \|$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return `<tr>${cells.map(c => `<td class="px-4 py-2 border border-border text-sm">${c.trim()}</td>`).join('')}</tr>`;
    })
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-primary mt-1">•</span><span>$1</span></li>')
    .replace(/(<li.+<\/li>\n?)+/g, '<ul class="space-y-2 my-4">$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li class="text-muted-foreground">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
      const isInternal = href.startsWith('/');
      return `<a href="${href}" ${isInternal ? '' : 'target="_blank" rel="noopener noreferrer"'} class="text-primary hover:underline">${text}</a>`;
    })
    .replace(/\n\n/g, '</p><p class="text-muted-foreground leading-relaxed my-4">')
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```/, '');
      return `<pre class="bg-surface-2 rounded-xl p-4 overflow-x-auto border border-border my-6 text-sm font-mono">${code}</pre>`;
    });
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = getBlogPost(slug || "");
  const related = getRelatedPosts(slug || "");

  if (!post) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="text-3xl font-bold mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-8">This article doesn't exist or has been moved.</p>
          <Link to="/blog" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
            Back to Blog
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <SEOHead
        title={post.metaTitle}
        description={post.metaDescription}
        canonical={`/blog/${post.slug}`}
        keywords={post.keywords}
        ogType="article"
        schema={[
          articleSchema({
            title: post.title,
            description: post.metaDescription,
            datePublished: post.datePublished,
            dateModified: post.dateModified,
            url: `https://promotemymemes.com/blog/${post.slug}`,
          }),
          faqSchema(post.faqs),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]),
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-[1fr_300px] gap-12 max-w-6xl mx-auto">
          {/* Article */}
          <article>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>/</span>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <span>/</span>
              <span className="text-foreground truncate">{post.title}</span>
            </nav>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
                {post.category}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />{post.readTime}
              </span>
              <span className="text-xs text-muted-foreground">
                Updated {new Date(post.dateModified).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">{post.title}</h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">{post.excerpt}</p>

            {/* Content */}
            <div
              className="prose-custom"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />

            {/* FAQ Section */}
            <section className="mt-16">
              <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {post.faqs.map(f => (
                  <details key={f.question} className="card-glass rounded-xl border border-border group">
                    <summary className="p-5 font-semibold cursor-pointer flex items-center justify-between list-none">
                      {f.question}
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform flex-shrink-0" />
                    </summary>
                    <p className="px-5 pb-5 text-muted-foreground">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* CTA Block */}
            <div className="mt-12 p-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border text-center">
              <h3 className="text-xl font-bold mb-2">Ready to Apply These Strategies?</h3>
              <p className="text-muted-foreground mb-6">Promote your memecoin across 147+ Telegram groups, Twitter/X, and Discord — starting free.</p>
              <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                🚀 Start Free Promotion
              </Link>
            </div>

            {/* Back to Blog */}
            <div className="mt-8">
              <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Related Posts */}
              <div className="card-glass rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Related Articles
                </h3>
                <div className="space-y-4">
                  {related.map(r => (
                    <Link key={r.slug} to={`/blog/${r.slug}`} className="block group">
                      <p className="text-xs text-primary mb-1">{r.category}</p>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors leading-snug">{r.title}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Links */}
              <div className="card-glass rounded-xl border border-border p-5">
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {[
                    { to: "/", label: "Promote Your Token" },
                    { to: "/top-promoted-tokens", label: "Trending Tokens" },
                    { to: "/promote-pumpfun-token", label: "Pump.fun Promotion" },
                    { to: "/telegram-crypto-promotion", label: "Telegram Marketing" },
                  ].map(l => (
                    <Link key={l.to} to={l.to} className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                      {l.label} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-primary/10 rounded-xl border border-primary/20 p-5 text-center">
                <p className="font-semibold mb-2 text-sm">Promote Your Token</p>
                <p className="text-xs text-muted-foreground mb-4">Free tier available. Start in 2 minutes.</p>
                <Link to="/" className="block py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                  🚀 Start Free
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </PageLayout>
  );
}
