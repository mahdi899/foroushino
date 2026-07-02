import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-caption font-medium uppercase tracking-[0.2em] text-mist",
        className,
      )}
    >
      {children}
    </p>
  );
}
