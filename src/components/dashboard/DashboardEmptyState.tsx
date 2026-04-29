import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { type OnboardingStep } from "./types";

interface DashboardEmptyStateProps {
  steps: OnboardingStep[];
}

export function DashboardEmptyState({ steps }: DashboardEmptyStateProps) {
  return (
    <Card className="app-panel rounded-2xl">
      <CardHeader className="space-y-3">
        <div className="app-eyebrow">First launch checklist</div>
        <div>
          <CardTitle className="text-2xl">Get your first token live and promotion-ready</CardTitle>
          <CardDescription className="mt-2 max-w-2xl leading-6">
            Complete this once and the dashboard becomes your operating view for launches, campaign performance, and follow-up actions.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.label}
              to={step.to}
              className="group rounded-xl border border-border bg-background/50 p-4 transition-colors hover:bg-accent/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex h-7 min-w-7 items-center justify-center rounded-full border border-border px-2 text-[11px] font-semibold text-muted-foreground">
                  0{index + 1}
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{step.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
