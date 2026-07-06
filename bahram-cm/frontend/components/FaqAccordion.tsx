'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FaqAccordion({
  items,
  compact,
  variant = 'default',
}: {
  items: { q: string; a: string }[];
  compact?: boolean;
  variant?: 'default' | 'site';
}) {
  const [open, setOpen] = useState<number | null>(compact ? null : 0);
  const site = variant === 'site';
  return (
    <div
      className={cn(
        site
          ? 'divide-y divide-bone/10 overflow-hidden border border-bone/10 bg-charcoal-2/40'
          : 'divide-y divide-border overflow-hidden border border-border bg-surface',
        compact ? 'rounded-md text-[12px]' : 'rounded-lg',
      )}
    >
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className={cn(
                'flex w-full items-center justify-between gap-3 text-right',
                compact ? 'px-3 py-2.5' : 'gap-4 px-5 py-4',
              )}
              aria-expanded={isOpen}
            >
              <span
                className={cn(
                  site ? 'font-semibold text-bone' : 'font-semibold text-text',
                  compact && 'text-[12px] leading-snug',
                )}
              >
                {item.q}
              </span>
              <Plus
                className={cn(
                  'shrink-0 transition-transform duration-300',
                  site ? 'text-emerald' : 'text-accent',
                  compact ? 'h-4 w-4' : 'h-5 w-5',
                  isOpen && 'rotate-45',
                )}
                strokeWidth={1.6}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p
                    className={cn(
                      site ? 'text-mist' : 'text-text-muted',
                      compact ? 'px-3 pb-3 text-[11px] leading-relaxed' : 'px-5 pb-5 text-body leading-8',
                    )}
                  >
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
