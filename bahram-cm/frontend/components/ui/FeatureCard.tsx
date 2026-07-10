import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconTile } from "./IconTile";
import { cn } from "@/lib/cn";

type Props = {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  tone?: "emerald" | "gold" | "bone";
  badge?: string;
  className?: string;
  /** Tighter horizontal layout on small screens. */
  variant?: "default" | "compact";
};

export function FeatureCard({
  icon,
  title,
  description,
  tone = "emerald",
  badge,
  className,
  variant = "default",
}: Props) {
  const compact = variant === "compact";

  return (
    <article
      data-neon-tone={tone === "gold" ? "gold" : "emerald"}
      className={cn(
        "neon-surface-hover group relative h-full overflow-hidden rounded-card border border-bone/8 bg-charcoal/55 transition-colors duration-500 ease-[var(--ease-luxe)] hover:border-bone/20 hover:bg-charcoal/70",
        compact ? "p-4 sm:p-6" : "p-6",
        className,
      )}
    >
      <div className={cn(compact && "flex items-start gap-3 sm:block")}>
        <div className={cn("flex items-start justify-between", compact && "shrink-0 sm:mb-0")}>
          <IconTile icon={icon} tone={tone} size={compact ? "sm" : "md"} />
          {badge ? (
            <span className={cn("text-caption tracking-[0.18em] text-mist", compact && "hidden sm:inline")}>
              {badge}
            </span>
          ) : null}
        </div>

        <div className={cn("min-w-0", compact && "flex-1")}>
          <h3
            className={cn(
              "text-balance text-bone",
              compact ? "text-base font-semibold leading-snug sm:mt-6 sm:text-h3" : "mt-6 text-h3",
            )}
          >
            {title}
          </h3>
          <div
            className={cn(
              "text-bone-dim",
              compact ? "mt-1.5 text-sm leading-relaxed sm:mt-3" : "mt-3",
            )}
          >
            {description}
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-px start-6 end-6 h-px bg-gradient-to-l from-transparent via-emerald-glow/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
    </article>
  );
}
