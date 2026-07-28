"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStudentAuth } from "@/components/student-panel/auth/StudentAuthContext";

const iconButtonClass =
  "inline-flex items-center justify-center rounded-pill border border-bone/10 text-bone transition-colors hover:border-bone/30 hover:text-emerald-glow";

type PanelNavButtonProps = {
  className?: string;
  showLabel?: boolean;
  onNavigate?: () => void;
};

export function PanelNavButton({ className, showLabel = true, onNavigate }: PanelNavButtonProps) {
  const { isLoggedIn, displayName, openLogin } = useStudentAuth();
  const label = isLoggedIn ? displayName ?? "دانشجو" : "ورود";

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          openLogin({ redirectTo: "/panel" });
        }}
        aria-label={label}
        className={cn(
          iconButtonClass,
          "inline-flex shrink-0",
          showLabel ? "h-10 min-w-0 gap-2 px-3" : "h-10 w-10",
          className,
        )}
      >
        <LayoutDashboard className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
        {showLabel ? (
          <span className="min-w-0 truncate text-sm font-medium">{label}</span>
        ) : null}
      </button>
    );
  }

  return (
    <Link
      href="/panel"
      prefetch
      onClick={() => onNavigate?.()}
      aria-label={label}
      className={cn(
        iconButtonClass,
        "inline-flex shrink-0",
        showLabel ? "h-10 min-w-0 gap-2 px-3" : "h-10 w-10",
        className,
      )}
    >
      <LayoutDashboard className="h-[1.125rem] w-[1.125rem] shrink-0" strokeWidth={1.75} aria-hidden />
      {showLabel ? (
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      ) : null}
    </Link>
  );
}
