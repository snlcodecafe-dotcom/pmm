import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquare, Twitter, ExternalLink, Users, Globe, Hash, Camera } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";

interface PlatformChannel {
  name: string;
  url: string;
  members?: string;
  category?: string;
}

const PLATFORMS = [
  {
    key: "telegram",
    label: "Telegram",
    icon: <Send className="w-5 h-5" />,
    color: "hsl(200 90% 55%)",
    description: "Join our Telegram groups for real-time alpha, meme drops, and community discussions.",
    joinLabel: "Join Group",
  },
  {
    key: "discord",
    label: "Discord",
    icon: <MessageSquare className="w-5 h-5" />,
    color: "hsl(235 85% 65%)",
    description: "Join our Discord servers to connect with traders, share memes, and get exclusive alerts.",
    joinLabel: "Join Server",
  },
  {
    key: "twitter",
    label: "Twitter/X",
    icon: <Twitter className="w-5 h-5" />,
    color: "hsl(210 100% 60%)",
    description: "Follow us on X for viral token threads, alpha calls, and trending meme coverage.",
    joinLabel: "Follow",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <Camera className="w-5 h-5" />,
    color: "hsl(330 80% 55%)",
    description: "Follow for visual meme content, token spotlights, and behind-the-scenes.",
    joinLabel: "Follow",
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: <Hash className="w-5 h-5" />,
    color: "hsl(16 100% 50%)",
    description: "Join our subreddit communities for in-depth discussions, DD posts, and community calls.",
    joinLabel: "Join Subreddit",
  },
];

export default function Community() {
  const [activePlatform, setActivePlatform] = useState("telegram");
  const [posts, setPosts] = useState<any[]>([]);
  const [telegramGroups, setTelegramGroups] = useState<any[]>([]);
  const [discordWebhooks, setDiscordWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [postsRes, tgRes, dcRes] = await Promise.all([
        supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("telegram_groups").select("*").eq("is_active", true).order("total_posts", { ascending: false }),
        supabase.from("discord_webhooks").select("*").eq("is_active", true).order("total_posts", { ascending: false }),
      ]);
      if (postsRes.data) setPosts(postsRes.data);
      if (tgRes.data) setTelegramGroups(tgRes.data);
      if (dcRes.data) setDiscordWebhooks(dcRes.data);
      setLoading(false);
    })();
  }, []);

  const filteredPosts = posts.filter(p => {
    if (activePlatform === "twitter") return p.platform === "twitter" || p.platform === "Twitter/X";
    return p.platform.toLowerCase() === activePlatform;
  });

  const platformData = PLATFORMS.find(p => p.key === activePlatform)!;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <PageLayout>
      <SEOHead
        title="Community | PromoteMyMemes - Join Our Network"
        description="Join the PromoteMyMemes community across Telegram, Discord, Twitter/X, Instagram, and Reddit. See live posts and connect with memecoin traders."
      />

      <main className="app-page-shell">
        <div className="app-shell-container">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="app-eyebrow mb-4">
            <Users className="w-3.5 h-3.5" /> Community Hub
          </div>
          <h1 className="app-headline mb-3">
            Join Our <span className="gradient-text-purple">Community</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Connect with memecoin traders across 5 platforms. See live posts, join groups, and become part of the network.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide pb-2">
          {PLATFORMS.map(p => (
              <button
              key={p.key}
              onClick={() => setActivePlatform(p.key)}
                className="app-pill-button flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs"
              style={{
                background: activePlatform === p.key ? `${p.color}20` : "hsl(var(--surface-1))",
                color: activePlatform === p.key ? p.color : "hsl(var(--muted-foreground))",
                border: `1px solid ${activePlatform === p.key ? `${p.color}50` : "hsl(var(--border))"}`,
              }}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Groups/Channels to Join */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-black flex items-center gap-2">
              <Globe className="w-4 h-4" style={{ color: platformData.color }} />
              {platformData.label} Channels
            </h2>
            <p className="text-xs text-muted-foreground">{platformData.description}</p>

            {activePlatform === "telegram" && (
              <div className="space-y-2">
                {/* Main Channel CTA */}
                <a href="https://t.me/promotememesai" target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: "hsl(200 90% 55% / 0.12)", border: "1px solid hsl(200 90% 55% / 0.3)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(200 90% 55% / 0.2)" }}>
                      <Send className="w-4 h-4" style={{ color: "hsl(200 90% 55%)" }} />
                    </div>
                    <div>
                      <div className="text-xs font-black">@promotememesai</div>
                      <div className="text-[10px] text-muted-foreground">Main Channel</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "hsl(200 90% 55% / 0.2)", color: "hsl(200 90% 55%)" }}>
                    Join <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                  </span>
                </a>
                {telegramGroups.map(g => (
                  <div key={g.id} className="app-panel flex items-center justify-between rounded-xl p-3"
                    style={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: "hsl(120 70% 50%)" }} />
                      <div>
                        <div className="text-xs font-bold">{g.group_name}</div>
                        <div className="text-[10px] text-muted-foreground">{g.category} · {g.total_posts} posts</div>
                      </div>
                    </div>
                  </div>
                ))}
                {telegramGroups.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6 rounded-xl" style={{ background: "hsl(var(--surface-1))" }}>
                    Join our main channel above to get started!
                  </div>
                )}
              </div>
            )}

            {activePlatform === "discord" && (
              <div className="space-y-2">
                {discordWebhooks.map(w => (
                  <div key={w.id} className="app-panel flex items-center justify-between rounded-xl p-3"
                    style={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: "hsl(120 70% 50%)" }} />
                      <div>
                        <div className="text-xs font-bold">{w.server_name}</div>
                        <div className="text-[10px] text-muted-foreground">#{w.channel_name} · {w.total_posts} posts</div>
                      </div>
                    </div>
                  </div>
                ))}
                {discordWebhooks.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-6 rounded-xl" style={{ background: "hsl(var(--surface-1))" }}>
                    Discord servers coming soon!
                  </div>
                )}
              </div>
            )}

            {activePlatform === "twitter" && (
              <div className="space-y-2">
                <a href="https://x.com/promotememesai" target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: "hsl(210 100% 60% / 0.12)", border: "1px solid hsl(210 100% 60% / 0.3)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(210 100% 60% / 0.2)" }}>
                      <Twitter className="w-4 h-4" style={{ color: "hsl(210 100% 60%)" }} />
                    </div>
                    <div>
                      <div className="text-xs font-black">@promotememesai</div>
                      <div className="text-[10px] text-muted-foreground">Official Account</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "hsl(210 100% 60% / 0.2)", color: "hsl(210 100% 60%)" }}>
                    Follow <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                  </span>
                </a>
              </div>
            )}

            {activePlatform === "instagram" && (
              <div className="space-y-2">
                <a href="https://instagram.com/promotememesai" target="_blank" rel="noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
                  style={{ background: "hsl(330 80% 55% / 0.12)", border: "1px solid hsl(330 80% 55% / 0.3)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(330 80% 55% / 0.2)" }}>
                      <Camera className="w-4 h-4" style={{ color: "hsl(330 80% 55%)" }} />
                    </div>
                    <div>
                      <div className="text-xs font-black">@promotememesai</div>
                      <div className="text-[10px] text-muted-foreground">Instagram</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "hsl(330 80% 55% / 0.2)", color: "hsl(330 80% 55%)" }}>
                    Follow <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                  </span>
                </a>
              </div>
            )}

            {activePlatform === "reddit" && (
              <div className="space-y-2">
                {["CryptoMoonShots", "SatoshiStreetBets", "memecoin"].map(sub => (
                  <a key={sub} href={`https://reddit.com/r/${sub}`} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl transition-all hover:opacity-90"
                    style={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(16 100% 50% / 0.15)" }}>
                        <Hash className="w-4 h-4" style={{ color: "hsl(16 100% 50%)" }} />
                      </div>
                      <div>
                        <div className="text-xs font-black">r/{sub}</div>
                        <div className="text-[10px] text-muted-foreground">Subreddit</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "hsl(16 100% 50% / 0.15)", color: "hsl(16 100% 50%)" }}>
                      Join <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Right: Recent Posts Feed */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-black mb-4 flex items-center gap-2">
              {platformData.icon}
              Recent {platformData.label} Posts
            </h2>

            {loading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">Loading posts...</div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-3">
                {filteredPosts.map(post => (
                  <div key={post.id} className="app-panel rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${platformData.color}15`, color: platformData.color }}>
                          {platformData.icon}
                        </div>
                        <span className="text-[10px] font-bold capitalize" style={{ color: platformData.color }}>{post.platform}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(var(--foreground))" }}>
                      {post.post_text.length > 400 ? post.post_text.slice(0, 400) + "..." : post.post_text}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>👁 {post.views ?? 0} views</span>
                        <span>❤️ {post.likes ?? 0} likes</span>
                        <span>🔁 {post.shares ?? 0} shares</span>
                      </div>
                      {(() => {
                        const platform = post.platform?.toLowerCase();
                        let url = "";
                        if (platform === "telegram") url = "https://t.me/promotememesai";
                        else if (platform === "twitter" || platform === "twitter/x") url = "https://x.com/promotememesai";
                        else if (platform === "discord") url = "";
                        else if (platform === "instagram") url = "https://instagram.com/promotememesai";
                        else if (platform === "reddit") url = "https://reddit.com/user/promotememesai";
                        return url ? (
                          <a href={url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:opacity-80"
                            style={{ background: `${platformData.color}15`, color: platformData.color }}>
                            View on {platformData.label} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="app-panel rounded-xl py-16 text-center">
                <div className="text-3xl mb-3">{platformData.icon}</div>
                <p className="text-sm font-bold mb-1">No {platformData.label} posts yet</p>
                <p className="text-xs text-muted-foreground">Posts will appear here once campaigns start running on {platformData.label}.</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
