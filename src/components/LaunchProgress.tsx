import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type LaunchPhase = {
  key: string;
  label: string;
  status: "done" | "active" | "pending" | "future";
};

interface Props {
  phases: LaunchPhase[];
  className?: string;
}

export function LaunchProgress({ phases, className }: Props) {
  return (
    <ol className={cn("space-y-2", className)}>
      {phases.map((p) => (
        <li key={p.key} className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border",
              p.status === "done" && "border-primary bg-primary text-primary-foreground",
              p.status === "active" && "border-primary text-primary",
              p.status === "pending" && "border-muted-foreground/40 text-muted-foreground",
              p.status === "future" && "border-muted-foreground/20 text-muted-foreground/50",
            )}
          >
            {p.status === "done" && <Check className="h-3 w-3" />}
            {p.status === "active" && <Loader2 className="h-3 w-3 animate-spin" />}
            {(p.status === "pending" || p.status === "future") && <Circle className="h-2 w-2" />}
          </span>
          <span
            className={cn(
              "text-sm",
              p.status === "done" && "text-foreground",
              p.status === "active" && "text-foreground font-medium",
              p.status === "pending" && "text-muted-foreground",
              p.status === "future" && "text-muted-foreground/60",
            )}
          >
            {p.label}
          </span>
          {p.status === "future" && (
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/60">Soon</span>
          )}
        </li>
      ))}
    </ol>
  );
}
