import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Check,
  Coins,
  Crown,
  RefreshCw,
  Search,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProfileRow = Tables<"profiles">;
type PartnerChannelRow = Tables<"partner_channels">;
type UserRoleRow = Tables<"user_roles">;
type PartnerEarningRow = Tables<"partner_earnings">;
type TokenLaunchSummary = Pick<Tables<"token_launches">, "id" | "user_id" | "token_name" | "token_symbol" | "mint_address" | "created_at" | "token_created" | "metadata_attached" | "liquidity_added" | "liquidity_locked" | "promotion_started">;
type TokenSubmissionSummary = Pick<Tables<"token_submissions">, "id" | "user_id" | "token_name" | "token_symbol" | "token_address" | "status" | "campaign_status" | "promotion_type" | "created_at" | "wallet_address">;
type UserWalletSummary = Pick<Tables<"user_wallets">, "id" | "user_id" | "wallet_address" | "is_primary" | "verified_at">;

type AdminUsersTabProps = {
  password: string;
};

type UserWithAdmin = ProfileRow & {
  isAdmin: boolean;
  partnerChannels: number;
  totalEarned: number;
  pendingEarned: number;
  launches: TokenLaunchSummary[];
  submissions: TokenSubmissionSummary[];
  wallets: UserWalletSummary[];
};

type PartnerWithOwner = PartnerChannelRow & {
  ownerName: string;
  ownerWallet: string | null;
  totalEarned: number;
  pendingEarned: number;
  earningsCount: number;
};

type ManagementLoad = {
  profiles: ProfileRow[];
  roles: Pick<UserRoleRow, "user_id" | "role">[];
  partners: PartnerChannelRow[];
  earnings: Pick<PartnerEarningRow, "id" | "partner_user_id" | "channel_id" | "commission_sol" | "payout_status" | "created_at" | "referral_code">[];
  launches: TokenLaunchSummary[];
  submissions: TokenSubmissionSummary[];
  wallets: UserWalletSummary[];
};

const statusBadge = (status: string) => {
  if (status === "verified") return "bg-primary/10 text-primary border-primary/20";
  if (status === "rejected") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-secondary/10 text-secondary border-secondary/20";
};

const botBadge = (value: boolean) => (
  value
    ? "bg-primary/10 text-primary border-primary/20"
    : "bg-destructive/10 text-destructive border-destructive/20"
);

const shortWallet = (value: string | null) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "—");

const formatDate = (value: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

export function AdminUsersTab({ password }: AdminUsersTabProps) {
  const [profiles, setProfiles] = useState<UserWithAdmin[]>([]);
  const [partners, setPartners] = useState<PartnerWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function callAdmin(action: string, payload: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke("admin-partner-management", {
      body: { action, password, ...payload },
    });

    const bodyError = (data as { error?: string } | null)?.error;
    if (bodyError) throw new Error(bodyError);
    if (error) throw new Error(error.message || "Request failed");
    return data;
  }

  async function load() {
    setLoading(true);
    try {
      const raw = await callAdmin("load") as Partial<ManagementLoad> | null;
      const data: ManagementLoad = {
        profiles: raw?.profiles ?? [],
        roles: raw?.roles ?? [],
        partners: raw?.partners ?? [],
        earnings: raw?.earnings ?? [],
        launches: raw?.launches ?? [],
        submissions: raw?.submissions ?? [],
        wallets: raw?.wallets ?? [],
      };
      const adminIds = new Set(data.roles.filter((role) => role.role === "admin").map((role) => role.user_id));

      const earningsByUser = new Map<string, { total: number; pending: number }>();
      const earningsByChannel = new Map<string, { total: number; pending: number; count: number }>();

      for (const earning of data.earnings ?? []) {
        const amount = Number(earning.commission_sol || 0);
        const userAgg = earningsByUser.get(earning.partner_user_id) ?? { total: 0, pending: 0 };
        userAgg.total += amount;
        if (earning.payout_status === "pending") userAgg.pending += amount;
        earningsByUser.set(earning.partner_user_id, userAgg);

        if (earning.channel_id) {
          const channelAgg = earningsByChannel.get(earning.channel_id) ?? { total: 0, pending: 0, count: 0 };
          channelAgg.total += amount;
          channelAgg.count += 1;
          if (earning.payout_status === "pending") channelAgg.pending += amount;
          earningsByChannel.set(earning.channel_id, channelAgg);
        }
      }

      const profileMap = new Map(data.profiles.map((profile) => [profile.user_id, profile]));

      setProfiles(
        data.profiles.map((profile) => {
          const summary = earningsByUser.get(profile.user_id) ?? { total: 0, pending: 0 };
          return {
            ...profile,
            isAdmin: adminIds.has(profile.user_id),
            partnerChannels: data.partners.filter((channel) => channel.user_id === profile.user_id).length,
            totalEarned: summary.total,
            pendingEarned: summary.pending,
            launches: data.launches.filter((launch) => launch.user_id === profile.user_id),
            submissions: data.submissions.filter((submission) => submission.user_id === profile.user_id),
            wallets: data.wallets.filter((wallet) => wallet.user_id === profile.user_id),
          };
        }),
      );

      setPartners(
        data.partners.map((channel) => {
          const summary = earningsByChannel.get(channel.id) ?? { total: 0, pending: 0, count: 0 };
          const owner = profileMap.get(channel.user_id);
          return {
            ...channel,
            ownerName: owner?.display_name || "Unnamed user",
            ownerWallet: owner?.primary_wallet ?? null,
            totalEarned: summary.total,
            pendingEarned: summary.pending,
            earningsCount: summary.count,
          };
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (password) void load();
  }, [password]);

  async function setRole(userId: string, makeAdmin: boolean) {
    const key = `role-${userId}-${makeAdmin ? "on" : "off"}`;
    setWorkingKey(key);
    try {
      await callAdmin("set-role", { userId, makeAdmin });
      toast.success(makeAdmin ? "Admin access granted" : "Admin access removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setWorkingKey(null);
    }
  }

  async function setPartnerStatus(channelId: string, status: "verified" | "rejected") {
    const key = `status-${channelId}-${status}`;
    setWorkingKey(key);
    try {
      await callAdmin("set-partner-status", {
        channelId,
        status,
        rejectionReason: status === "rejected" ? "Rejected by admin review" : null,
      });
      toast.success(status === "verified" ? "Channel approved" : "Channel rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update partner");
    } finally {
      setWorkingKey(null);
    }
  }

  async function auditChannel(channelId: string) {
    const key = `audit-${channelId}`;
    setWorkingKey(key);
    try {
      await callAdmin("audit-channel", { channelId });
      toast.success("Bot access and live channel stats refreshed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not audit channel");
    } finally {
      setWorkingKey(null);
    }
  }

  const filteredProfiles = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return profiles;
    return profiles.filter((profile) =>
      [profile.display_name, profile.primary_wallet, profile.primary_role, profile.user_id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [profiles, query]);

  const filteredPartners = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return partners;
    return partners.filter((partner) =>
      [
        partner.telegram_channel_name,
        partner.telegram_channel_id,
        partner.referral_code,
        partner.ownerName,
        partner.ownerWallet,
        partner.discord_server_name,
        partner.discord_invite_link,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value)),
    );
  }, [partners, query]);

  const stats = useMemo(() => ({
    users: profiles.length,
    admins: profiles.filter((profile) => profile.isAdmin).length,
    partners: partners.length,
    verified: partners.filter((partner) => partner.verification_status === "verified").length,
    botMissing: partners.filter((partner) => !partner.bot_is_admin).length,
    channelsWithEarnings: partners.filter((partner) => partner.totalEarned > 0).length,
  }), [profiles, partners]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={<UserRound className="h-4 w-4" />} label="Users" value={String(stats.users)} />
        <StatCard icon={<Shield className="h-4 w-4" />} label="Admins" value={String(stats.admins)} />
        <StatCard icon={<Crown className="h-4 w-4" />} label="Partner channels" value={String(stats.partners)} />
        <StatCard icon={<BadgeCheck className="h-4 w-4" />} label="Verified" value={String(stats.verified)} />
        <StatCard icon={<Bot className="h-4 w-4" />} label="Bot missing" value={String(stats.botMissing)} tone="danger" />
        <StatCard icon={<Coins className="h-4 w-4" />} label="Earning live" value={String(stats.channelsWithEarnings)} tone="success" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/35 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Partner control center</h3>
          <p className="text-xs text-muted-foreground">Audit bot admin access, approve channels, and confirm partner earnings are flowing.</p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users, wallets, channels, or referral codes" className="pl-9" />
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60">
          <TabsTrigger value="partners">Partner channels</TabsTrigger>
          <TabsTrigger value="users">User management</TabsTrigger>
          <TabsTrigger value="earnings">Earn module health</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="mt-0 space-y-4">
          <InfoStrip
            icon={<Bot className="h-4 w-4" />}
            title="How admin verifies bot access"
             copy="Use Audit on any channel to re-check live subscriber count and confirm whether your active Telegram bot is still an administrator on that channel. Approve also syncs the channel/webhook into the distribution network."
          />
          <div className="rounded-2xl border border-border bg-background/35">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Channel</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Bot access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Earn module</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <EmptyRow colSpan={6} label="Loading partner channels..." />
                ) : filteredPartners.length === 0 ? (
                  <EmptyRow colSpan={6} label="No partner channels match your search." />
                ) : filteredPartners.map((channel) => {
                  const verifyKey = `status-${channel.id}-verified`;
                  const rejectKey = `status-${channel.id}-rejected`;
                  const auditKey = `audit-${channel.id}`;
                  const earningsLive = channel.totalEarned > 0 || channel.earningsCount > 0;

                  return (
                    <TableRow key={channel.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">
                            {channel.telegram_channel_name || channel.telegram_channel_id || "Unnamed channel"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {channel.telegram_channel_id || channel.telegram_channel_link || "No Telegram id saved"}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className="border-border bg-background/60 text-foreground">
                              {channel.subscriber_count.toLocaleString()} subs
                            </Badge>
                            <Badge variant="outline" className="border-border bg-background/60 text-foreground">
                              {channel.tier_percent}% tier
                            </Badge>
                            <Badge variant="outline" className="border-border bg-background/60 font-mono text-foreground">
                              {channel.referral_code || "No ref"}
                            </Badge>
                          </div>
                          {channel.discord_server_name && (
                            <div className="pt-2 text-xs text-muted-foreground">
                              Discord: <span className="text-foreground">{channel.discord_server_name}</span>
                              {channel.discord_invite_link ? <span className="ml-1 font-mono break-all">· {channel.discord_invite_link}</span> : null}
                            </div>
                          )}
                          {channel.rejection_reason && (
                            <div className="text-xs text-destructive">{channel.rejection_reason}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">{channel.ownerName}</div>
                          <div className="font-mono text-xs text-muted-foreground">{shortWallet(channel.ownerWallet)}</div>
                          <div className="text-xs text-muted-foreground">Last check: {formatDate(channel.last_checked_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <Badge variant="outline" className={cn("border", botBadge(channel.bot_is_admin))}>
                            {channel.bot_is_admin ? "Bot is admin" : "Bot missing admin"}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {channel.joined_main_channel ? "Joined main channel" : "Main channel join not confirmed"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-2">
                          <Badge variant="outline" className={cn("border capitalize", statusBadge(channel.verification_status))}>
                            {channel.verification_status}
                          </Badge>
                          <div className="text-xs text-muted-foreground">Verified: {formatDate(channel.verified_at)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <Badge variant="outline" className={cn("border", earningsLive ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground")}>
                            {earningsLive ? "Earnings recorded" : "No earnings yet"}
                          </Badge>
                          <div className="text-xs text-muted-foreground">Total: {channel.totalEarned.toFixed(3)} SOL</div>
                          <div className="text-xs text-muted-foreground">Pending: {channel.pendingEarned.toFixed(3)} SOL</div>
                          <div className="text-xs text-muted-foreground">Conversions: {channel.earningsCount}</div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => auditChannel(channel.id)} disabled={workingKey === auditKey}>
                            <RefreshCw className={cn("h-4 w-4", workingKey === auditKey && "animate-spin")} /> Audit
                          </Button>
                          <Button type="button" size="sm" onClick={() => setPartnerStatus(channel.id, "verified")} disabled={workingKey === verifyKey}>
                            <Check className="h-4 w-4" /> Approve
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => setPartnerStatus(channel.id, "rejected")} disabled={workingKey === rejectKey}>
                            <X className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-0 space-y-4">
          <InfoStrip
            icon={<Shield className="h-4 w-4" />}
            title="Why user management was failing"
            copy="The old screen relied on database role permissions from the client; this version runs through a secure admin function so grant and revoke actions now work reliably."
          />
          <div className="rounded-2xl border border-border bg-background/35">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Wallets</TableHead>
                  <TableHead>App activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <EmptyRow colSpan={5} label="Loading users..." />
                ) : filteredProfiles.length === 0 ? (
                  <EmptyRow colSpan={5} label="No users match your search." />
                ) : filteredProfiles.map((profile) => {
                  const grantKey = `role-${profile.user_id}-on`;
                  const revokeKey = `role-${profile.user_id}-off`;
                  return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-foreground">{profile.display_name || "Unnamed user"}</div>
                          <div className="text-xs text-muted-foreground">{profile.primary_role || "No primary role"}</div>
                          <div className="text-xs text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("border", profile.isAdmin ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground")}>
                          {profile.isAdmin ? "Admin" : "Standard user"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="font-mono">Primary: {shortWallet(profile.primary_wallet)}</div>
                          <div>{profile.wallets.length} linked wallet(s)</div>
                          {profile.wallets.slice(0, 2).map((wallet) => (
                            <div key={wallet.id} className="font-mono">{shortWallet(wallet.wallet_address)} {wallet.is_primary ? "• primary" : ""}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div>{profile.partnerChannels} connected channel(s)</div>
                          <div>{profile.launches.length} token launch(es)</div>
                          <div>{profile.submissions.length} promotion submission(s)</div>
                          <div>Total earned: {profile.totalEarned.toFixed(3)} SOL</div>
                          <div>Pending: {profile.pendingEarned.toFixed(3)} SOL</div>
                          {profile.launches[0] && <div>Latest launch: {profile.launches[0].token_symbol || profile.launches[0].token_name}</div>}
                          {profile.submissions[0] && <div>Latest promotion: {profile.submissions[0].promotion_type} · {profile.submissions[0].status}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {profile.isAdmin ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => setRole(profile.user_id, false)} disabled={workingKey === revokeKey}>
                            <Shield className="h-4 w-4" /> Remove admin
                          </Button>
                        ) : (
                          <Button type="button" size="sm" onClick={() => setRole(profile.user_id, true)} disabled={workingKey === grantKey}>
                            <Shield className="h-4 w-4" /> Make admin
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="earnings" className="mt-0 space-y-4">
          <InfoStrip
            icon={<Coins className="h-4 w-4" />}
            title="How admin confirms the Earn module is working"
            copy="If a verified partner channel has a referral code, bot admin access, and conversions or SOL values below, the earn flow is working. Zero earnings with traffic means the partner needs usage, not a broken setup."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {loading ? (
              <div className="rounded-2xl border border-border bg-background/35 p-8 text-sm text-muted-foreground">Loading earnings health...</div>
            ) : filteredPartners.length === 0 ? (
              <div className="rounded-2xl border border-border bg-background/35 p-8 text-sm text-muted-foreground">No partner channels match your search.</div>
            ) : filteredPartners.map((partner) => {
              const health = partner.bot_is_admin && partner.verification_status === "verified";
              return (
                <div key={partner.id} className="rounded-2xl border border-border bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{partner.telegram_channel_name || partner.telegram_channel_id || "Unnamed channel"}</h4>
                      <p className="text-xs text-muted-foreground">{partner.ownerName} · {shortWallet(partner.ownerWallet)}</p>
                    </div>
                    <Badge variant="outline" className={cn("border", health ? "border-primary/20 bg-primary/10 text-primary" : "border-destructive/20 bg-destructive/10 text-destructive")}>
                      {health ? "Ready to earn" : "Needs attention"}
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <MiniMetric label="Referral code" value={partner.referral_code || "Missing"} mono />
                    <MiniMetric label="Bot access" value={partner.bot_is_admin ? "Confirmed" : "Missing"} />
                    <MiniMetric label="Total earned" value={`${partner.totalEarned.toFixed(3)} SOL`} />
                    <MiniMetric label="Pending payout" value={`${partner.pendingEarned.toFixed(3)} SOL`} />
                    <MiniMetric label="Conversions" value={String(partner.earningsCount)} />
                    <MiniMetric label="Last audit" value={formatDate(partner.last_checked_at)} />
                  </div>
                  {(!partner.bot_is_admin || !partner.referral_code) && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {!partner.referral_code ? "This channel cannot earn until it has a referral code." : "This channel cannot be trusted for partner payouts until the Telegram bot is admin."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value, tone = "default" }: { icon: React.ReactNode; label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const toneClass = tone === "success"
    ? "border-primary/20 bg-primary/10 text-primary"
    : tone === "danger"
      ? "border-destructive/20 bg-destructive/10 text-destructive"
      : "border-border bg-background/35 text-foreground";

  return (
    <div className={cn("rounded-2xl border p-4", toneClass)}>
      <div className="mb-2 flex items-center gap-2 text-xs font-medium">{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-3">
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-semibold text-foreground", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}

function InfoStrip({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/10 p-4">
      <div className="mt-0.5 text-secondary">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy}</p>
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );
}