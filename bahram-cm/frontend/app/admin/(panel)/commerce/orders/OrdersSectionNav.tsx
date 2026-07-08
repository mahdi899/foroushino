'use client';

import Link from 'next/link';
import { BarChart3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'list' as const, href: '/admin/commerce/orders', label: 'لیست سفارش‌ها', icon: List },
  { id: 'reports' as const, href: '/admin/commerce/orders/reports', label: 'گزارش نموداری', icon: BarChart3 },
];

export function OrdersSectionNav({ active }: { active: 'list' | 'reports' }) {
  return (
    <nav
      aria-label="بخش‌های سفارشات"
      className="mb-5 overflow-x-auto rounded-xl border border-border bg-surface p-1.5"
    >
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3.5 py-2 text-small font-medium transition',
                  isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-text-muted hover:bg-surface-soft hover:text-primary-dark',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
