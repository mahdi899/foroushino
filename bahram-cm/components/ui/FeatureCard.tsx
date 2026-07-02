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
};

export function FeatureCard({
  icon,
  title,
  description,
  tone = "emerald",
  badge,
  className,
}: Props) {
  return (
    <article
      data-neon-tone={tone === "gold" ? "gold" : "emerald"}
      className={cn(
        "neon-surface-hover group relative h-full overflow-hidden rounded-card border border-bone/8 bg-charcoal/55 p-6 transition-colors duration-500 ease-[var(--ease-luxe)] hover:border-bone/20 hover:bg-charcoal/70",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <IconTile icon={icon} tone={tone} />
        {badge ? (
          <span className="text-caption tracking-[0.18em] text-mist">{badge}</span>
        ) : null}
      </div>
      <h3 className="mt-6 text-h3 text-balance text-bone">{title}</h3>
      <div className="mt-3 text-bone-dim">{description}</div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-px start-6 end-6 h-px bg-gradient-to-l from-transparent via-emerald-glow/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
    </article>
  );
}
