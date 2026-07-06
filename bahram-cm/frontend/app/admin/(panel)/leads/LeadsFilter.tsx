'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FORM_TYPE_FILTERS } from '@/lib/admin/formTypes';

export function LeadsFilter() {
  const searchParams = useSearchParams();
  const current = searchParams.get('type') ?? '';

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {FORM_TYPE_FILTERS.map((f) => {
        const href = f.value ? `/admin/leads?type=${f.value}` : '/admin/leads';
        const active = current === f.value;
        return (
          <Link
            key={f.value || 'all'}
            href={href}
            className={cn(
              'rounded-pill px-3 py-1.5 text-caption font-medium transition-colors',
              active ? 'bg-primary text-white' : 'bg-surface-soft text-text-muted hover:bg-accent-soft hover:text-primary',
            )}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
