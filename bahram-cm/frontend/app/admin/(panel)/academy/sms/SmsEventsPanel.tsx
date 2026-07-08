'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SmsEventCategoryView, SmsEventView, SmsProviderView } from '@/lib/admin/smsCenter.types';
import { eventToForm, groupEventsByCategory, SMS_EVENT_CATEGORY_ORDER } from '@/lib/admin/smsCenter.types';
import { SmsEventCard } from './SmsEventCard';
import { Badge } from '../../ui';

export function SmsEventsPanel({
  events,
  categories,
  providers,
}: {
  events: SmsEventView[];
  categories: SmsEventCategoryView[];
  providers: SmsProviderView[];
}) {
  const grouped = groupEventsByCategory(events);
  const categoryLabels = new Map(categories.map((c) => [c.key, c.label]));
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SMS_EVENT_CATEGORY_ORDER.map((key) => [key, true])),
  );

  const orderedKeys = SMS_EVENT_CATEGORY_ORDER.filter((key) => grouped.has(key));

  return (
    <div className="space-y-3">
      {orderedKeys.map((categoryKey) => {
        const items = grouped.get(categoryKey) ?? [];
        const enabledCount = items.filter((e) => e.is_enabled).length;
        const isOpen = openCategories[categoryKey] ?? true;

        return (
          <section key={categoryKey} className="overflow-hidden rounded-lg border border-border bg-surface">
            <button
              type="button"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [categoryKey]: !isOpen }))}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start hover:bg-surface-soft/60"
            >
              <div className="flex min-w-0 items-center gap-2">
                <ChevronDown className={`h-4 w-4 shrink-0 text-text-muted transition ${isOpen ? '' : '-rotate-90'}`} />
                <h3 className="text-small font-bold text-primary-dark">
                  {categoryLabels.get(categoryKey) ?? categoryKey}
                </h3>
                <Badge tone="default">{items.length} رویداد</Badge>
                <span className="text-caption text-text-muted">{enabledCount} فعال</span>
              </div>
            </button>

            {isOpen ? (
              <div className="space-y-2 border-t border-border p-2">
                {items.map((event) => (
                  <SmsEventCard
                    key={event.event_key}
                    event={event}
                    providers={providers}
                    initial={eventToForm(event)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
