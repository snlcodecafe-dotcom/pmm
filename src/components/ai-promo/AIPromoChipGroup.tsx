import { cn } from "@/lib/utils";

interface ChipOption {
  id: string;
  label: string;
}

interface AIPromoChipGroupProps<T extends string> {
  options: readonly (ChipOption & { id: T })[];
  selected: T;
  onSelect: (value: T) => void;
  accent?: "primary" | "secondary";
}

export function AIPromoChipGroup<T extends string>({
  options,
  selected,
  onSelect,
  accent = "primary",
}: AIPromoChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => {
        const isActive = option.id === selected;
        const activeStyle = accent === "secondary"
          ? { borderColor: "hsl(var(--secondary) / 0.55)", background: "hsl(var(--secondary) / 0.12)", color: "hsl(var(--secondary))" }
          : { borderColor: "hsl(var(--primary) / 0.55)", background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" };

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            style={isActive ? activeStyle : undefined}
            className={cn(
              "rounded-full border border-border bg-background/50 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/35 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}