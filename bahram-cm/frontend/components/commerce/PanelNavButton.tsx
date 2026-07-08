"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";

const iconButtonClass =
  "inline-flex items-center justify-center rounded-pill border border-bone/10 text-bone transition-colors hover:border-bone/30 hover:text-emerald-glow";

type PanelNavButtonProps = {
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
};

export function PanelNavButton({ className, showLabel = true, onNavigate }: PanelNavButtonProps) {
  return (
    <Link
      href="/panel"
      onClick={onNavigate}
      aria-label="پنل دانشجو"
      className={cn(
        iconButtonClass,
        "inline-flex shrink-0",
        showLabel ? "h-10 gap-2 px-3" : "h-10 w-10",
        className,
      )}
    >
      <LayoutDashboard className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
      {showLabel ? (
        <span className="text-sm font-medium whitespace-nowrap">پنل دانشجو</span>
      ) : null}
    </Link>
  );
}
