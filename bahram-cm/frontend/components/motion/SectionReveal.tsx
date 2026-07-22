"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Static wrapper — section entrance animations removed for reliable mobile paint. */
export function SectionReveal({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
