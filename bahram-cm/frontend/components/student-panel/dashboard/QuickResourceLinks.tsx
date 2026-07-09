'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  ACADEMY_LINK_META,
  ACADEMY_LINK_ORDER,
  type AcademyLinkKey,
} from '@/components/student-panel/academy/academyLinkMeta';
import { PanelAcademyLinkSheet } from '@/components/student-panel/academy/PanelAcademyLinkSheet';
import { cn } from '@/lib/cn';

export function QuickResourceLinks({
  urls,
}: {
  urls: Record<AcademyLinkKey, string | null>;
}) {
  const [activeKey, setActiveKey] = useState<AcademyLinkKey | null>(null);
  const activeMeta = activeKey ? ACADEMY_LINK_META[activeKey] : null;

  function handleDirectOpen() {
    if (!activeKey) return;
    const href = urls[activeKey]?.trim();
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    setActiveKey(null);
  }

  return (
    <>
      <div className="card panel-quick-links-section p-5 text-right">
        <div className="panel-quick-links-section__header mb-4">
          <h2 className="text-base font-bold text-text">لینک‌های سریع و منابع</h2>
          <p className="panel-section-subtitle">دسترسی سریع به کانال‌ها و ربات دوره</p>
        </div>

        <div className="panel-quick-links-list flex flex-col gap-2">
          {ACADEMY_LINK_ORDER.map((key) => {
            const meta = ACADEMY_LINK_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className={cn(
                  'panel-link-row panel-link-row--action',
                  `panel-link-row--${meta.variant}`,
                )}
              >
                <span className="panel-link-row__main flex items-center gap-3">
                  <span className={cn('panel-link-row__icon', meta.rowTone)}>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="panel-link-row__label">{meta.quickLabel}</span>
                </span>
                <ChevronLeft size={16} className="panel-link-row__chevron shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      <PanelAcademyLinkSheet
        open={activeKey !== null}
        title={activeMeta?.quickLabel ?? ''}
        stepKey={activeKey ?? ''}
        url={activeKey ? urls[activeKey] : null}
        onClose={() => setActiveKey(null)}
        onDirectOpen={handleDirectOpen}
      />
    </>
  );
}
