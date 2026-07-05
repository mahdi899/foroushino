"use client";

import Lottie from "lottie-react";
import { useMemo, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  tintLottieBlackToBrand,
  type LottieBrandTone,
  type LottieThemeMode,
} from "@/lib/lottieTint";

const tones: Record<
  LottieBrandTone,
  { ring: string; bg: string; aura: string }
> = {
  emerald: {
    ring: "ring-emerald/30",
    bg: "bg-emerald-deep/40",
    aura: "shadow-[0_0_40px_-12px_rgba(0,140,150,0.42)]",
  },
  gold: {
    ring: "ring-gold/25",
    bg: "bg-gold/[0.08]",
    aura: "shadow-[0_0_40px_-12px_rgba(255,176,0,0.42)]",
  },
  bone: {
    ring: "ring-bone/10",
    bg: "bg-bone/[0.05]",
    aura: "",
  },
};

function subscribeTheme(onStoreChange: () => void) {
  const obs = new MutationObserver(onStoreChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

function getThemeSnapshot(): LottieThemeMode {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

/** Tile matching `IconTile` 2xl frame — Lottie loops inside, tints to theme tokens. */
export function LottieTile({
  animationData,
  tone = "emerald",
  className,
}: {
  animationData: object;
  tone?: LottieBrandTone;
  className?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    (): LottieThemeMode => "dark",
  );

  const tintedData = useMemo(
    () => tintLottieBlackToBrand(animationData, tone, theme),
    [animationData, tone, theme],
  );

  const t = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-tile ring-1 ring-inset",
        "h-[5.25rem] w-[5.25rem]",
        t.ring,
        t.bg,
        t.aura,
        className,
      )}
    >
      <Lottie
        key={`${tone}-${theme}`}
        animationData={tintedData}
        loop
        className="h-[84%] w-[84%] [&_svg]:block"
      />
    </span>
  );
}
