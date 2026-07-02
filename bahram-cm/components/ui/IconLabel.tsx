import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { liveIcon } from "@/lib/iconMotion";

export function IconLabel({
  icon: Icon,
  children,
  tone = "bone",
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  tone?: "bone" | "gold" | "emerald" | "mist";
  className?: string;
}) {
  const colors: Record<string, string> = {
    bone: "text-bone",
    gold: "text-gold",
    emerald: "text-emerald-glow",
    mist: "text-mist",
  };
  return (
    <span
      data-icon-label-tone={tone}
      className={cn(
        "group inline-flex items-center gap-2 text-[0.95rem]",
        colors[tone],
        className,
      )}
    >
      <Icon className={liveIcon("h-4 w-4 shrink-0")} strokeWidth={1.6} aria-hidden />
      <span>{children}</span>
    </span>
  );
}
