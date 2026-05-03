import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, Sparkles } from "lucide-react";

type Settings = {
  id: number;
  is_enabled: boolean;
  posts_per_day: number;
  start_time: string;
  end_time: string;
  platforms: string[];
  default_image_url: string | null;
  last_generated_for: string | null;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  platform: string;
  scheduled_time: string;
  status: string;
  error_message: string | null;
  posted_at: string | null;
};

const PLATFORMS = [
  { id: "telegram", label: "Telegram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
];

export default function AutoPromoteEngineTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("automation_settings").select("*").eq("id", 1).single(),
      supabase.from("generated_posts").select("*").order("scheduled_time", { ascending: false }).limit(100),
    ]);
    if (s) setSettings(s as Settings);
    if (p) setPosts(p as Post[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("auto-promote-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_posts" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function save(patch: Partial<Settings>) {
    if (!settings) return;
    setSaving(true);
    const next = { ...settings, ...patch };
    setSettings(next);
    const { error } = await supabase.from("automation_settings").update({
      is_enabled: next.is_enabled,
      posts_per_day: next.posts_per_day,
      start_time: next.start_time,
      end_time: next.end_time,
      platforms: next.platforms,
      default_image_url: next.default_image_url,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  }

  async function invoke(action: "generate" | "dispatch" | "auto") {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("auto-promote-engine", { body: { action } });
    setRunning(false);
    if (error) {
      toast({ title: "Run failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Run complete", description: JSON.stringify(data) });
      load();
    }
  }

  const upcoming = useMemo(() => posts.filter(p => p.status === "pending").slice().reverse(), [posts]);
  const postedLogs = useMemo(() => posts.filter(p => p.status === "posted"), [posts]);
  const failed = useMemo(() => posts.filter(p => p.status === "failed"), [posts]);

  if (loading || !settings) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card className="p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Auto Promote Engine</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            When ON, the system generates and posts AI content to selected platforms automatically. Turning OFF immediately halts dispatch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${settings.is_enabled ? "text-primary" : "text-muted-foreground"}`}>
            {settings.is_enabled ? "ACTIVE" : "PAUSED"}
          </span>
          <Switch checked={settings.is_enabled} onCheckedChange={(v) => save({ is_enabled: v })} disabled={saving} />
        </div>
      </Card>

      {/* Settings */}
      <Card className="p-5 space-y-4">
        <h3 className="font-bold">Automation Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Posts per day</Label>
            <Input type="number" min={1} max={50} value={settings.posts_per_day}
              onChange={(e) => save({ posts_per_day: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} />
          </div>
          <div>
            <Label>Start time (UTC)</Label>
            <Input type="time" value={settings.start_time?.slice(0, 5)}
              onChange={(e) => save({ start_time: `${e.target.value}:00` })} />
          </div>
          <div>
            <Label>End time (UTC)</Label>
            <Input type="time" value={settings.end_time?.slice(0, 5)}
              onChange={(e) => save({ end_time: `${e.target.value}:00` })} />
          </div>
        </div>
        <div>
          <Label>Default image URL (Instagram fallback)</Label>
          <Input value={settings.default_image_url ?? ""} placeholder="https://..."
            onChange={(e) => save({ default_image_url: e.target.value })} />
        </div>
        <div>
          <Label className="mb-2 block">Platforms</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map(p => {
              const checked = settings.platforms.includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-muted/40">
                  <Checkbox checked={checked} onCheckedChange={(v) => {
                    const next = v ? [...settings.platforms, p.id] : settings.platforms.filter(x => x !== p.id);
                    save({ platforms: next });
                  }} />
                  <span className="text-sm">{p.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Twitter & Instagram will mark posts as "failed" until their API credentials are configured in backend secrets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={() => invoke("generate")} disabled={running} variant="secondary">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate today
          </Button>
          <Button onClick={() => invoke("dispatch")} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Dispatch due now
          </Button>
          <span className="text-xs text-muted-foreground self-center ml-2">
            Scheduler also runs automatically every 5 minutes.
          </span>
        </div>
      </Card>

      {/* Upcoming */}
      <Card className="p-5">
        <h3 className="font-bold mb-3">Upcoming scheduled posts ({upcoming.length})</h3>
        <div className="max-h-80 overflow-auto divide-y divide-border">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground py-4">No pending posts.</p>}
          {upcoming.map(p => <PostRow key={p.id} p={p} />)}
        </div>
      </Card>

      {/* Posted */}
      <Card className="p-5">
        <h3 className="font-bold mb-3">Posted ({postedLogs.length})</h3>
        <div className="max-h-80 overflow-auto divide-y divide-border">
          {postedLogs.length === 0 && <p className="text-sm text-muted-foreground py-4">Nothing posted yet.</p>}
          {postedLogs.map(p => <PostRow key={p.id} p={p} />)}
        </div>
      </Card>

      {/* Failed */}
      <Card className="p-5">
        <h3 className="font-bold mb-3 text-destructive">Failed ({failed.length})</h3>
        <div className="max-h-80 overflow-auto divide-y divide-border">
          {failed.length === 0 && <p className="text-sm text-muted-foreground py-4">No failures.</p>}
          {failed.map(p => <PostRow key={p.id} p={p} />)}
        </div>
      </Card>
    </div>
  );
}

function PostRow({ p }: { p: Post }) {
  return (
    <div className="py-2 flex items-start gap-3">
      <div className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">{p.platform}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm whitespace-pre-wrap line-clamp-3">{p.content}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(p.scheduled_time).toLocaleString()} · {p.status}
          {p.error_message && <span className="text-destructive ml-2">— {p.error_message}</span>}
        </div>
      </div>
    </div>
  );
}
