'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SmsEventCategoryView, SmsEventView, SmsProviderView } from '@/lib/admin/smsCenter.types';
import { eventToForm, groupEventsByCategory, SMS_EVENT_CATEGORY_ORDER } from '@/lib/admin/smsCenter.types';
import { SmsEventCard } from './SmsEventCard';
import { cn } from '@/lib/utils';

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
    <div className="admin-sms-hub__events">
      {orderedKeys.map((categoryKey) => {
        const items = grouped.get(categoryKey) ?? [];
        const enabledCount = items.filter((e) => e.is_enabled).length;
        const isOpen = openCategories[categoryKey] ?? true;

        return (
          <section key={categoryKey} className="admin-dashboard-panel admin-sms-hub__category">
            <button
              type="button"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [categoryKey]: !isOpen }))}
              className="admin-dashboard-panel__head admin-sms-hub__category-head"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-text-muted transition', !isOpen && '-rotate-90')}
                  strokeWidth={2}
                />
                <h3 className="admin-dashboard-panel__title">{categoryLabels.get(categoryKey) ?? categoryKey}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-caption">
                <span className="admin-sms-hub__category-stat">{items.length.toLocaleString('fa-IR')} رویداد</span>
                <span className="admin-sms-hub__category-stat admin-sms-hub__category-stat--active">
                  {enabledCount.toLocaleString('fa-IR')} فعال
                </span>
              </div>
            </button>

            {isOpen ? (
              <div className="admin-sms-hub__category-body">
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
