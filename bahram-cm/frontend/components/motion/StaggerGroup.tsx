"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
};

/** Static wrapper — stagger animations removed for reliable mobile paint. */
export function StaggerGroup({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}

type ItemProps = {
  children: ReactNode;
  className?: string;
  y?: number;
};

export function StaggerItem({ children, className }: ItemProps) {
  return <div className={className}>{children}</div>;
}
