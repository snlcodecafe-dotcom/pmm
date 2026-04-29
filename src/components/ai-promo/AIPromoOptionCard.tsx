import { cn } from "@/lib/utils";

interface AIPromoOptionCardProps {
  title: string;
  description: string;
  meta?: string;
  icon?: string;
  selected?: boolean;
  accent?: "primary" | "secondary";
  onClick: () => void;
}

export function AIPromoOptionCard({
  title,
  description,
  meta,
  icon,
  selected = false,
  accent = "primary",
  onClick,
}: AIPromoOptionCardProps) {
  const accentStyles = accent === "secondary"
    ? {
        borderColor: selected ? "hsl(var(--secondary) / 0.55)" : "hsl(var(--border))",
        background: selected ? "hsl(var(--secondary) / 0.12)" : "hsl(var(--card) / 0.78)",
        color: selected ? "hsl(var(--secondary))" : undefined,
      }
    : {
        borderColor: selected ? "hsl(var(--primary) / 0.55)" : "hsl(var(--border))",
        background: selected ? "hsl(var(--primary) / 0.12)" : "hsl(var(--card) / 0.78)",
        color: selected ? "hsl(var(--primary))" : undefined,
      };

  return (
    <button
      type="button"
      onClick={onClick}
      style={accentStyles}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left transition-colors duration-150 hover:bg-accent/30",
        selected ? "shadow-[0_14px_36px_-24px_hsl(var(--foreground)/0.45)]" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            {icon ? <span aria-hidden>{icon}</span> : null}
            <span className="truncate">{title}</span>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        {meta ? <span className="shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">{meta}</span> : null}
      </div>
    </button>
  );
}