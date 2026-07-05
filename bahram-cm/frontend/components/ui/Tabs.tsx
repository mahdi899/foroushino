"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";

type Tab = { id: string; label: string; /** برچسب کوتاه‌تر برای موبایل (اختیاری) */ shortLabel?: string; content: ReactNode };

export function Tabs({ tabs, className }: { tabs: Tab[]; className?: string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const reduce = useReducedMotion();
  const theme = useDataTheme();

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="فصل‌ها"
        className={cn(
          "flex gap-1 rounded-pill border border-bone/10 bg-charcoal/40 p-1 sm:gap-2 sm:p-1.5",
          "max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[-webkit-overflow-scrolling:touch]",
          "max-sm:[scrollbar-width:thin] max-sm:[&::-webkit-scrollbar]:h-1 max-sm:[&::-webkit-scrollbar-thumb]:rounded-full max-sm:[&::-webkit-scrollbar-thumb]:bg-bone/20",
          "sm:flex-wrap",
        )}
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActive(tab.id)}
              type="button"
              className={cn(
                "relative rounded-pill px-3 py-2 text-sm transition-colors duration-300 sm:shrink-0 sm:px-4",
                "max-sm:flex-1 max-sm:min-w-0 max-sm:basis-0 max-sm:text-center max-sm:leading-snug",
                selected
                  ? theme === "light"
                    ? "text-emerald-deep"
                    : "text-ink"
                  : "text-bone-dim hover:text-bone",
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 -z-[1] rounded-pill bg-emerald-glow"
                  transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              <span className="relative">
                <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 md:mt-8">
        {tabs.map((tab) =>
          tab.id === active ? (
            <motion.div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab.content}
            </motion.div>
          ) : null,
        )}
      </div>
    </div>
  );
}
