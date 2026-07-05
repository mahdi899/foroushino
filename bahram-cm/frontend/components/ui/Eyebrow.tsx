import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The small gold caption that introduces a section. The leading dot is a
 * 4px gold pellet that anchors the eye and signals "this is a chapter".
 */
export function Eyebrow({
  children,
  className,
  dotClassName,
  withDot = true,
  as: Tag = "p",
}: {
  children: ReactNode;
  className?: string;
  /** Override the leading dot color (e.g. on gold surfaces). */
  dotClassName?: string;
  /** When false, render label only (e.g. beside a shared rail dot). */
  withDot?: boolean;
  as?: "p" | "span" | "div";
}) {
  return (
    <Tag
      className={cn(
        withDot ? "inline-flex items-center gap-2.5" : "block",
        "text-caption uppercase tracking-[0.25em] text-gold",
        className,
      )}
    >
      {withDot ? (
        <span
          aria-hidden
          className={cn("inline-block h-[5px] w-[5px] rounded-full bg-gold", dotClassName)}
        />
      ) : null}
      <span className="font-medium">{children}</span>
    </Tag>
  );
}
