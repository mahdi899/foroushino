import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Chip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-bone/10 bg-bone/[0.02] px-3 py-1 text-caption text-bone-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}
