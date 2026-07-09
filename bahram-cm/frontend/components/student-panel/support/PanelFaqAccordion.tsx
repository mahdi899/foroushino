'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PanelFaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="panel-faq-list">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <div key={item.q} className={cn('panel-accordion-item', isOpen && 'panel-accordion-item--open')}>
            <button
              type="button"
              className="panel-accordion-trigger"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown
                size={16}
                className={cn('shrink-0 text-text-muted transition-transform duration-200', isOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {isOpen ? <div className="panel-accordion-content">{item.a}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
