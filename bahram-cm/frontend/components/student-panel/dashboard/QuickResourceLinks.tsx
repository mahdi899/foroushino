'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import {
  ACADEMY_LINK_META,
  ACADEMY_LINK_ORDER,
  type AcademyLinkKey,
} from '@/components/student-panel/academy/academyLinkMeta';
import { PanelAcademyLinkSheet } from '@/components/student-panel/academy/PanelAcademyLinkSheet';

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
      <div className="card p-5 text-right">
        <h2 className="mb-4 text-base font-bold text-text">لینک‌های سریع و منابع</h2>
        <div className="flex flex-col gap-2">
          {ACADEMY_LINK_ORDER.map((key) => {
            const meta = ACADEMY_LINK_META[key];
            const Icon = meta.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey(key)}
                className="panel-link-row panel-link-row--action"
              >
                <span className="flex items-center gap-3">
                  <span className={`panel-link-row__icon ${meta.rowTone}`}>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  {meta.quickLabel}
                </span>
                <ChevronLeft size={16} className="text-text-muted" />
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
