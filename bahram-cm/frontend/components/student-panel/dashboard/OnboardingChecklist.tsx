'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { markOnboardingStepAction } from '@/lib/student/panelActions';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  url: string | null;
}

const CLICK_TRACKED = new Set(['telegram_channel', 'rubika_channel', 'telegram_bot', 'customer_club']);

export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const pendingIndex = items.findIndex((item) => !item.done);

  return (
    <div className="panel-checklist-scroll -mx-1 px-1">
      <ul className="panel-checklist-list flex flex-col gap-1">
      {items.map((item, index) => {
        const content = (
          <span className="panel-checklist-item" data-done={item.done}>
            {item.done ? (
              <CheckCircle2 size={20} className="shrink-0 text-success" />
            ) : (
              <span className="panel-checklist-num">{index + 1}</span>
            )}
            <span className={`text-sm ${item.done ? 'text-text-muted line-through' : 'text-text'}`}>{item.label}</span>
          </span>
        );

        if (item.done || !item.url) {
          return <li key={item.key}>{content}</li>;
        }

        const isExternal = item.url.startsWith('http');
        const isTracked = CLICK_TRACKED.has(item.key);
        const isNext = index === pendingIndex;

        return (
          <li key={item.key}>
            <Link
              href={item.url}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={() => {
                if (isTracked) void markOnboardingStepAction(item.key);
              }}
              className={`block w-full rounded-lg text-right transition ${isNext ? 'bg-primary/5 px-1 -mx-1' : 'hover:opacity-80'}`}
            >
              {content}
            </Link>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
