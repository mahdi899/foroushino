"use client";

import { useSyncExternalStore } from "react";

export type DataTheme = "light" | "dark";

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => obs.disconnect();
}

function getSnapshot(): DataTheme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function getServerSnapshot(): DataTheme {
  return "dark";
}

/** Reads `data-theme` on `<html>` (same source as `ThemeToggle` / `ThemeScript`). */
export function useDataTheme(): DataTheme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
