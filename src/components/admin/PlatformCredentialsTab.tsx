import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Save } from "lucide-react";

type Row = {
  platform: string;
  credentials: Record<string, string>;
  is_enabled: boolean;
};

const SCHEMAS: Record<string, { label: string; fields: { key: string; label: string; placeholder?: string; secret?: boolean }[]; help: string }> = {
  telegram: {
    label: "Telegram",
    help: "Create a bot with @BotFather. Add the bot as admin to your channel and use the channel's @username or numeric chat ID.",
    fields: [
      { key: "bot_token", label: "Bot Token", placeholder: "123456:ABC-...", secret: true },
      { key: "channel_id", label: "Channel ID / @username", placeholder: "@yourchannel or -1001234567890" },
    ],
  },
  twitter: {
    label: "Twitter / X",
    help: "Create an app at developer.x.com. App must have 'Read and Write' permissions. Generate user-context Access Token + Secret.",
    fields: [
      { key: "consumer_key", label: "Consumer Key (API Key)", secret: true },
      { key: "consumer_secret", label: "Consumer Secret (API Secret)", secret: true },
      { key: "access_token", label: "Access Token", secret: true },
      { key: "access_token_secret", label: "Access Token Secret", secret: true },
    ],
  },
  instagram: {
    label: "Instagram",
    help: "Requires an Instagram Business/Creator account linked to a Facebook Page. Use a long-lived token with instagram_basic + instagram_content_publish.",
    fields: [
      { key: "access_token", label: "Long-lived Access Token", secret: true },
      { key: "user_id", label: "Instagram Business Account ID", placeholder: "17841400000000000" },
    ],
  },
};

export default function PlatformCredentialsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, Row>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("platform_credentials").select("*");
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    const map: Record<string, Row> = {};
    for (const r of data ?? []) {
      map[r.platform] = { platform: r.platform, credentials: (r.credentials as any) ?? {}, is_enabled: r.is_enabled };
    }
    // Ensure all platforms exist
    for (const p of Object.keys(SCHEMAS)) {
      if (!map[p]) {
        const blank: Record<string, string> = {};
        SCHEMAS[p].fields.forEach(f => (blank[f.key] = ""));
        map[p] = { platform: p, credentials: blank, is_enabled: false };
      }
    }
    setRows(map);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save(platform: string) {
    setSavingKey(platform);
    const r = rows[platform];
    const { error } = await supabase.from("platform_credentials").upsert({
      platform,
      credentials: r.credentials,
      is_enabled: r.is_enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "platform" });
    setSavingKey(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: `${SCHEMAS[platform].label} credentials saved` });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Platform Credentials</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure API credentials for each platform used by the Auto Promote Engine. Credentials are stored securely and only accessible by admins.
        </p>
      </Card>

      {Object.entries(SCHEMAS).map(([platform, schema]) => {
        const r = rows[platform];
        return (
          <Card key={platform} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">{schema.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{schema.help}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${r.is_enabled ? "text-primary" : "text-muted-foreground"}`}>
                  {r.is_enabled ? "ENABLED" : "DISABLED"}
                </span>
                <Switch
                  checked={r.is_enabled}
                  onCheckedChange={(v) => setRows(prev => ({ ...prev, [platform]: { ...prev[platform], is_enabled: v } }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schema.fields.map(f => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  <Input
                    type={f.secret ? "password" : "text"}
                    autoComplete="off"
                    placeholder={f.placeholder}
                    value={r.credentials[f.key] ?? ""}
                    onChange={(e) => setRows(prev => ({
                      ...prev,
                      [platform]: { ...prev[platform], credentials: { ...prev[platform].credentials, [f.key]: e.target.value } },
                    }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save(platform)} disabled={savingKey === platform}>
                {savingKey === platform ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save {schema.label}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
