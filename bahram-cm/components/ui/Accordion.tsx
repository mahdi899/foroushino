"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AccordionItem = { question: string; answer: ReactNode };

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "neon-surface-static divide-y divide-bone/8 rounded-card border border-bone/10 bg-charcoal/45",
        className,
      )}
    >
      {items.map((item, idx) => {
        const open = openIndex === idx;
        const panelId = `${baseId}-${idx}-panel`;
        const triggerId = `${baseId}-${idx}-trigger`;
        return (
          <div key={item.question}>
            <button
              id={triggerId}
              aria-controls={panelId}
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : idx)}
              className="group flex w-full items-center justify-between gap-4 p-6 text-start text-bone hover:text-bone-dim"
            >
              <span className="text-lg font-semibold leading-snug text-balance text-bone md:text-xl">
                {item.question}
              </span>
              <span
                className={cn(
                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-bone/15 text-mist transition-transform duration-500 ease-[var(--ease-luxe)]",
                  open && "rotate-45 border-emerald/40 text-emerald-glow",
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 text-body text-bone-dim">
                    {item.answer}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
