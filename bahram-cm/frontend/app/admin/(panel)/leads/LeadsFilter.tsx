'use client';

import Link from 'next/link';
import { FORM_TYPE_FILTERS } from '@/lib/admin/formTypes';

type Props = {
  currentType?: string;
};

export function LeadsFilter({ currentType = '' }: Props) {
  const activeLabel = FORM_TYPE_FILTERS.find((f) => f.value === currentType)?.label ?? 'همه';

  return (
    <div className="admin-period-toolbar admin-leads-filter">
      <div className="admin-period-segments">
        {FORM_TYPE_FILTERS.map((f) => {
          const href = f.value ? `/admin/leads?type=${f.value}` : '/admin/leads';
          const active = currentType === f.value;
          return (
            <Link
              key={f.value || 'all'}
              href={href}
              className="admin-period-btn"
              data-active={active ? 'true' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
      <span className="admin-period-summary">فیلتر: {activeLabel}</span>
    </div>
  );
}
