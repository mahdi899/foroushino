"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { isLoggedIn, displayName, openLogin } = useStudentAuth();
  const label = isLoggedIn ? displayName ?? "دانشجو" : "ورود";

  function handleClick() {
    onNavigate?.();
    if (isLoggedIn) {
      router.push("/panel");
      return;
    }
    openLogin({ redirectTo: "/panel" });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
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
