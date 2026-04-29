import { ArrowRight, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { formatAgo, type ActivityItem } from "./types";

interface DashboardBottomProps {
  recentActivity: ActivityItem[];
  activePanel: string | null;
}

export function DashboardSidebar({ recentActivity, activePanel }: DashboardBottomProps) {
  return (
    <div className="space-y-6">
      {activePanel === "ai_promo" && (
        <Card className="app-panel rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" /> AI Promo</CardTitle>
            <CardDescription>Build messaging, tone, and delivery from one focused workflow.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full"><Link to="/ai-promo">Open AI Promo</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-border bg-background/40"><Link to="/campaign-engine">Customize package</Link></Button>
          </CardContent>
        </Card>
      )}

      {activePanel === "viral" && (
        <Card className="app-panel rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><TrendingUp className="h-5 w-5 text-primary" /> Viral Loop</CardTitle>
            <CardDescription>Pair community distribution with repeat exposure to keep momentum building.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full"><Link to="/viral-loop">Open Viral Loop</Link></Button>
            <Button asChild variant="outline" className="rounded-full border-border bg-background/40"><Link to="/community">Grow community</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity - Left */}
        <Card className="app-panel rounded-2xl">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Your latest launch and campaign updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Activity will appear here after your first token launch or campaign.
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border bg-background/50 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium leading-5">{activity.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{activity.detail}</div>
                    </div>
                    <Badge variant={activity.kind === "launch" ? "secondary" : "outline"} className="shrink-0 border-border bg-background/40">
                      {formatAgo(activity.created_at)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Next Best Actions - Right */}
        <Card className="app-panel rounded-2xl">
          <CardHeader>
            <CardTitle>Next best actions</CardTitle>
            <CardDescription>Simple follow-up actions to keep progress moving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              asChild
              className="w-full justify-between rounded-xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/40 hover:ring-primary/60"
            >
              <Link to="/audit-token">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Audit a Token</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between rounded-xl border-border bg-background/40">
              <Link to="/campaign-engine">Customize your next package <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between rounded-xl border-border bg-background/40">
              <Link to="/community">Grow community reach <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-between rounded-xl border-border bg-background/40">
              <Link to="/partner/apply">Unlock earning channels <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
