import { MetricNumber } from "./MetricNumber";
import { LottieTile } from "./LottieTile";
import { cn } from "@/lib/cn";

type Props = {
  animationData: object;
  value: string;
  label: string;
  caption?: string;
  tone?: "emerald" | "gold" | "bone";
  className?: string;
};

export function StatCard({
  animationData,
  value,
  label,
  caption,
  tone = "emerald",
  className,
}: Props) {
  return (
    <article
      data-neon-tone={tone === "gold" ? "gold" : "emerald"}
      className={cn(
        "neon-surface-static group relative flex h-full flex-col overflow-hidden rounded-card border border-bone/8 bg-charcoal/45 p-7 md:p-8",
        "hover:-translate-y-1.5 hover:border-bone/[0.22] hover:bg-charcoal/[0.58]",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          tone === "gold"
            ? "bg-[radial-gradient(125%_90%_at_100%_0%,rgba(197,164,107,0.14),transparent_55%)]"
            : "bg-[radial-gradient(125%_90%_at_100%_0%,rgba(23,138,104,0.12),transparent_55%)]",
        )}
      />
      <div className="relative z-[1] flex min-h-full flex-1 flex-col gap-5">
        <div className="shrink-0 transition-transform duration-300 ease-luxe will-change-transform group-hover:scale-[1.04]">
          <LottieTile animationData={animationData} tone={tone} />
        </div>

        {caption ? (
          <p className="max-w-[26ch] font-display text-caption leading-relaxed tracking-wide text-bone-dim group-hover:text-bone/90">
            {caption}
          </p>
        ) : null}

        <div className="mt-auto w-full border-t border-bone/10 pt-6 transition-[border-color] duration-300 group-hover:border-bone/16">
          <p className="text-h2 w-full text-right font-semibold leading-none">
            <MetricNumber value={value} />
          </p>
          <p className="mt-3 w-full text-right text-body text-bone-dim">{label}</p>
        </div>
      </div>
    </article>
  );
}
