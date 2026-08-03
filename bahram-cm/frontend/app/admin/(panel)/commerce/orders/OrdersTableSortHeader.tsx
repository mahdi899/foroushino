'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminLucideIcon } from '@/lib/admin/lucide-icons';

export type OrdersTableSortKey = 'amount' | 'created_at';

export function OrdersTableSortHeader({
  label,
  sortKey,
  activeSort,
  activeDir,
}: {
  label: string;
  sortKey: OrdersTableSortKey;
  activeSort?: string;
  activeDir?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedSort = activeSort === 'amount' ? 'amount' : 'created_at';
  const active = resolvedSort === sortKey;
  const direction = active && activeDir === 'asc' ? 'asc' : 'desc';
  const icon = !active ? 'ArrowUpDown' : direction === 'asc' ? 'ArrowUp' : 'ArrowDown';

  function onSort() {
    const params = new URLSearchParams(searchParams.toString());
    const nextDir = active ? (direction === 'asc' ? 'desc' : 'asc') : 'desc';
    params.set('sort', sortKey);
    params.set('dir', nextDir);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <button
      type="button"
      className="admin-table-sort-btn"
      onClick={onSort}
      aria-label={
        active
          ? direction === 'asc'
            ? `${label} — مرتب‌سازی صعودی`
            : `${label} — مرتب‌سازی نزولی`
          : `${label} — مرتب‌سازی`
      }
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{label}</span>
      <AdminLucideIcon
        name={icon}
        className={active ? 'admin-table-sort-btn__icon is-active' : 'admin-table-sort-btn__icon'}
        strokeWidth={2}
      />
    </button>
  );
}
