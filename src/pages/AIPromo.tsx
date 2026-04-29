import { useMemo, useState } from "react";
import { Activity, Bot, Copy, Loader2, MessageSquare, Send, Sparkles, Wand2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIPromoOptionCard } from "@/components/ai-promo/AIPromoOptionCard";
import { AIPromoChipGroup } from "@/components/ai-promo/AIPromoChipGroup";

const TEMPLATE_OPTIONS = [
  { id: "early-gem", label: "🔮 Early Gem Alert", platforms: ["Twitter", "Telegram", "Discord", "Instagram", "Reddit"] },
  { id: "whale", label: "🐋 Whale Alert", platforms: ["Twitter", "Telegram", "Instagram"] },
  { id: "volume", label: "📈 Volume Spike", platforms: ["Twitter", "Telegram", "Discord", "Reddit"] },
  { id: "raid", label: "⚡ Community Raid", platforms: ["Telegram", "Discord", "Reddit"] },
] as const;

const PLATFORM_OPTIONS = [
  { id: "twitter", label: "🕊 X Twitter/X" },
  { id: "telegram", label: "✈ Telegram" },
  { id: "discord", label: "💬 Discord" },
  { id: "instagram", label: "📸📸 Instagram" },
  { id: "reddit", label: "🔴🔴 Reddit" },
] as const;

const STRATEGY_OPTIONS = [
  {
    id: "viral_pump",
    title: "Viral Pump Mode",
    description: "Meme-heavy content with high-frequency posting. Best for hype and FOMO.",
    meta: "50K–200K reach",
    icon: "🔥",
  },
  {
    id: "organic_growth",
    title: "Organic Growth Mode",
    description: "Natural community tone with slower posting. Builds trust and credibility.",
    meta: "10K–50K reach",
    icon: "🌱",
  },
  {
    id: "influencer_boost",
    title: "Influencer Boost Mode",
    description: "Influencer-style messaging with authority-driven tone.",
    meta: "30K–150K reach",
    icon: "🚀",
  },
] as const;

const TONE_OPTIONS = [
  { id: "degenerate", label: "🎰 Degenerate" },
  { id: "professional", label: "💼 Professional" },
  { id: "meme", label: "😂 Meme/Funny" },
  { id: "hype", label: "🚀 Hype/FOMO" },
] as const;

const FREQUENCY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const;

export default function AIPromo() {
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof TEMPLATE_OPTIONS)[number]["id"]>("early-gem");
  const [selectedPlatform, setSelectedPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]["id"]>("twitter");
  const [selectedStrategy, setSelectedStrategy] = useState<(typeof STRATEGY_OPTIONS)[number]["id"]>("organic_growth");
  const [selectedTone, setSelectedTone] = useState<(typeof TONE_OPTIONS)[number]["id"]>("degenerate");
  const [selectedFrequency, setSelectedFrequency] = useState<(typeof FREQUENCY_OPTIONS)[number]["id"]>("high");
  const [generatedPost, setGeneratedPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);

  const selectedTemplateData = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.id === selectedTemplate) ?? TEMPLATE_OPTIONS[0],
    [selectedTemplate],
  );

  const selectedPlatformLabel = useMemo(
    () => PLATFORM_OPTIONS.find((item) => item.id === selectedPlatform)?.label.replace(/^[^A-Za-z]+/, "") ?? "Twitter/X",
    [selectedPlatform],
  );

  const selectedStrategyData = useMemo(
    () => STRATEGY_OPTIONS.find((item) => item.id === selectedStrategy) ?? STRATEGY_OPTIONS[0],
    [selectedStrategy],
  );

  const previewHint = useMemo(() => {
    const frequencyMap: Record<(typeof FREQUENCY_OPTIONS)[number]["id"], string> = {
      low: "low-frequency rollout",
      medium: "balanced posting cadence",
      high: "high-frequency push",
    };

    return `${selectedPlatformLabel} · ${frequencyMap[selectedFrequency]}`;
  }, [selectedFrequency, selectedPlatformLabel]);

  const handleGenerate = async () => {
    if (!tokenSymbol.trim()) {
      toast.error("Enter token symbol first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          symbol: tokenSymbol.trim(),
          address: contractAddress.trim() || undefined,
          platform: selectedPlatform,
          tone: selectedTone,
          strategy: selectedStrategy,
          frequency: selectedFrequency,
          useAI: true,
          allPlatforms: false,
        },
      });

      if (error) throw new Error(error.message);
      setGeneratedPost(data?.post ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate post");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPost = async () => {
    if (!generatedPost) {
      toast.error("Generate a post first");
      return;
    }

    try {
      setCopying(true);
      await navigator.clipboard.writeText(generatedPost);
      toast.success("Post copied");
    } catch {
      toast.error("Could not copy post");
    } finally {
      setCopying(false);
    }
  };

  return (
    <PageLayout showCTABanner={false}>
      <main className="app-page-shell">
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">⚡ AI Promotion Engine</h1>
            <p className="app-section-copy text-sm sm:text-base">
              Generate viral posts powered by AI for Twitter, Telegram, Discord, Instagram &amp; Reddit
            </p>
          </div>

          <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
            <div className="space-y-5">
              <Card className="app-panel rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Generate AI Post
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">Token Symbol *</label>
                      <Input
                        value={tokenSymbol}
                        onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                        placeholder="e.g. BONK"
                        className="h-11 rounded-xl border-border bg-background/60 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-muted-foreground">Contract Address</label>
                      <Input
                        value={contractAddress}
                        onChange={(e) => setContractAddress(e.target.value)}
                        placeholder="Solana CA (optional)"
                        className="h-11 rounded-xl border-border bg-background/60 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Growth Strategy</div>
                    <div className="space-y-3">
                      {STRATEGY_OPTIONS.map((strategy) => (
                        <AIPromoOptionCard
                          key={strategy.id}
                          title={strategy.title}
                          description={strategy.description}
                          meta={strategy.meta}
                          icon={strategy.icon}
                          selected={selectedStrategy === strategy.id}
                          onClick={() => setSelectedStrategy(strategy.id)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Message Tone</div>
                      <AIPromoChipGroup options={TONE_OPTIONS} selected={selectedTone} onSelect={(value) => setSelectedTone(value as (typeof TONE_OPTIONS)[number]["id"])} accent="secondary" />
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Post Frequency</div>
                      <AIPromoChipGroup options={FREQUENCY_OPTIONS} selected={selectedFrequency} onSelect={(value) => setSelectedFrequency(value as (typeof FREQUENCY_OPTIONS)[number]["id"])} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Platform</div>
                    <div className="flex flex-wrap gap-2.5">
                      {PLATFORM_OPTIONS.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => setSelectedPlatform(platform.id)}
                          className={cn(
                            "rounded-full border border-border bg-background/50 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/35 hover:text-foreground",
                            selectedPlatform === platform.id && "border-primary/50 bg-primary/10 text-primary",
                          )}
                        >
                          {platform.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">Template Type</div>
                    <div className="flex flex-wrap gap-2.5">
                      {TEMPLATE_OPTIONS.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={cn(
                            "rounded-full border border-border bg-background/50 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/35 hover:text-foreground",
                            selectedTemplate === template.id && "border-primary/50 bg-primary/10 text-primary",
                          )}
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button size="lg" onClick={handleGenerate} disabled={loading} className="app-gradient-action h-11 w-full rounded-xl text-sm font-semibold hover:opacity-95">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {loading ? "Generating..." : "Generate AI Post"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="app-panel rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-5 w-5 text-secondary" />
                    Template Library
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2.5 md:grid-cols-2">
                  {TEMPLATE_OPTIONS.map((template, index) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border border-border bg-background/45 px-4 py-3 text-left transition-colors hover:bg-accent/30",
                        selectedTemplate === template.id && "border-primary/50 bg-primary/10",
                      )}
                    >
                      <div>
                        <div className="text-base font-semibold">{template.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{template.platforms.join(" · ")}</div>
                      </div>
                      <div className="rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                        {index === 0 ? 5 : index === 1 ? 3 : 4} variants
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5 xl:sticky xl:top-24">
              <Card className="app-panel rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between gap-3 text-xl">
                    <span className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      Live Preview
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPost}
                      disabled={!generatedPost || copying}
                      className="h-9 rounded-xl border-border bg-background/40 px-3 text-xs font-semibold hover:bg-accent/40 hover:text-foreground"
                    >
                      {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {selectedStrategyData.title}
                    </div>
                    <div className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {previewHint}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3 border-b border-border/80 pb-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">Generated Preview</div>
                        <div className="mt-1 text-xs text-muted-foreground">Optimized for {selectedPlatformLabel}</div>
                      </div>
                      <div className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {selectedTemplateData.label}
                      </div>
                    </div>

                    <div className="mt-4 max-h-[440px] overflow-auto rounded-xl border border-border bg-card/80 p-4">
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                        {generatedPost || "Your AI-generated post will appear here after you enter a token symbol and generate."}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="app-panel rounded-2xl">
                <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Bot className="h-5 w-5 text-primary" />
                    AI Engine Info
                </CardTitle>
              </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  {[
                    { value: "3", label: "Tone Modes" },
                    { value: String(PLATFORM_OPTIONS.length), label: "Platforms" },
                    { value: String(TEMPLATE_OPTIONS.length), label: "Template Types" },
                  ].map((item) => (
                    <div key={item.label} className="app-stat-card rounded-xl px-4 py-4">
                      <div className="text-3xl font-bold text-primary">{item.value}</div>
                      <div className="mt-1.5 text-sm text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="sr-only" aria-hidden>
            <p>{selectedTemplateData.label}</p>
            <p>{selectedPlatform}</p>
            <p>{tokenSymbol}</p>
            <p>{contractAddress}</p>
            <MessageSquare className="h-0 w-0" />
            <Send className="h-0 w-0" />
          </section>
        </div>
      </main>
    </PageLayout>
  );
}