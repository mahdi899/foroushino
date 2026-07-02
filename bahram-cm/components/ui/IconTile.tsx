import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { liveIcon } from "@/lib/iconMotion";

type Tone = "emerald" | "gold" | "bone";

const tones: Record<Tone, { ring: string; fg: string; bg: string; aura: string }> = {
  emerald: {
    ring: "ring-emerald/30",
    fg: "text-emerald-glow",
    bg: "bg-emerald-deep/40",
    aura: "shadow-[0_0_40px_-12px_rgba(47,176,127,0.55)]",
  },
  gold: {
    ring: "ring-gold/25",
    fg: "text-gold",
    bg: "bg-gold/[0.08]",
    aura: "shadow-[0_0_40px_-12px_rgba(197,164,107,0.58)]",
  },
  bone: {
    ring: "ring-bone/10",
    fg: "text-bone",
    bg: "bg-bone/[0.05]",
    aura: "",
  },
};

export function IconTile({
  icon: Icon,
  tone = "emerald",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}) {
  const t = tones[tone];
  const dim =
    size === "sm"
      ? "h-10 w-10"
      : size === "lg"
        ? "h-16 w-16"
        : size === "xl"
          ? "h-20 w-20"
          : size === "2xl"
            ? "h-[5.25rem] w-[5.25rem]"
            : "h-12 w-12";
  const iconSize =
    size === "sm"
      ? "h-4 w-4"
      : size === "lg"
        ? "h-7 w-7"
        : size === "xl"
          ? "h-9 w-9"
          : size === "2xl"
            ? "h-11 w-11"
            : "h-5 w-5";
  return (
    <span
      data-icon-tile-tone={tone}
      className={cn(
        "icon-tile inline-flex items-center justify-center rounded-tile ring-1 ring-inset",
        dim,
        t.ring,
        t.bg,
        size === "2xl" || size === "xl" || size === "lg" ? t.aura : "",
        className,
      )}
    >
      <Icon className={liveIcon(cn(iconSize, t.fg))} strokeWidth={1.4} aria-hidden />
    </span>
  );
}
