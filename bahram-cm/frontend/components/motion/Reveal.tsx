"use client";

import { createElement, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "article" | "header" | "h1" | "h2" | "h3" | "p" | "span" | "li";
  className?: string;
};

/** Static wrapper — scroll-reveal animations removed for reliable mobile paint. */
export function Reveal({ children, as = "div", className }: Props) {
  return createElement(as, { className }, children);
}
