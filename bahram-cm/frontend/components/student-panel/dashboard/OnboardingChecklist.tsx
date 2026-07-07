'use client';

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { markOnboardingStepAction } from '@/lib/student/panelActions';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  url: string | null;
}

const CLICK_TRACKED = new Set(['telegram_channel', 'rubika_channel', 'telegram_bot', 'customer_club']);

export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const content = (
          <span className="checklist-item flex items-center gap-3 py-3" data-done={item.done}>
            {item.done ? (
              <CheckCircle2 size={20} className="shrink-0 text-success" />
            ) : (
              <Circle size={20} className="shrink-0 text-text-muted" />
            )}
            <span className="text-sm text-text">{item.label}</span>
          </span>
        );

        if (item.done || !item.url) {
          return <li key={item.key}>{content}</li>;
        }

        const isExternal = item.url.startsWith('http');
        const isTracked = CLICK_TRACKED.has(item.key);

        return (
          <li key={item.key}>
            <Link
              href={item.url}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={() => {
                if (isTracked) void markOnboardingStepAction(item.key);
              }}
              className="block hover:opacity-80"
            >
              {content}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
