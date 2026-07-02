"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useChannelChipIconShell } from "@/lib/useAccentIconSurfaces";

export type PressChannel = {
  icon: LucideIcon;
  label: string;
  note: string;
  tint: "jade" | "gold";
};

export function PressPresenceChannelChip({ item }: { item: PressChannel }) {
  const Icon = item.icon;
  const isJade = item.tint === "jade";
  const { shell, iconClass } = useChannelChipIconShell(isJade);

  return (
    <span
      dir="rtl"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 rounded-pill border border-bone/12 bg-charcoal/35 px-3.5 py-1.5 pl-4",
        "shadow-veil backdrop-blur-md ring-1 ring-inset ring-white/[0.03]",
      )}
    >
      <span
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
          shell,
        )}
        aria-hidden
      >
        <Icon className={cn("size-[16px]", iconClass)} strokeWidth={1.5} />
      </span>
      <span className="flex min-w-0 flex-col items-start gap-0 text-start">
        <span className="text-[0.88rem] font-medium leading-snug tracking-tight text-bone">
          {item.label}
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.2em] text-mist">{item.note}</span>
      </span>
    </span>
  );
}
