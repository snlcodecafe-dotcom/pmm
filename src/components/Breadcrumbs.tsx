import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  items: Crumb[];
  className?: string;
}

/**
 * Lightweight breadcrumb trail used across token-tools and audit pages.
 * Renders semantic <nav aria-label="breadcrumb"> with JSON-LD via SEOHead-supplied schemas.
 */
export default function Breadcrumbs({ items, className }: Props) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li className="flex items-center">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <Home className="h-3 w-3" /> Home
          </Link>
        </li>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 opacity-60" />
              {c.to && !last ? (
                <Link to={c.to} className="hover:text-foreground transition-colors">{c.label}</Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={last ? "text-foreground font-medium" : undefined}>{c.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
