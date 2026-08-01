'use client';

import { useEffect, useState } from 'react';
import { OrdersAnalyticsDashboard } from '../OrdersAnalyticsDashboard';
import type { OrderAnalytics } from '@/lib/admin/commerceTypes';

export function OrdersReportsClient({
  periodDays,
}: {
  periodDays: number | 'all';
}) {
  const [data, setData] = useState<OrderAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const daysParam = periodDays === 'all' ? 'all' : String(periodDays);
    void fetch(`/api/admin/orders/analytics?days=${encodeURIComponent(daysParam)}`, {
      credentials: 'include',
    })
      .then(async (res) => {
        const payload = (await res.json()) as { data?: OrderAnalytics; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setData(null);
          setError(payload.error ?? 'بارگذاری گزارش ناموفق بود.');
          return;
        }
        setData(payload.data ?? null);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setError('بارگذاری گزارش ناموفق بود. اتصال اینترنت را بررسی کنید.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [periodDays]);

  if (loading) {
    return (
      <div className="card p-8 text-center text-small text-text-muted">
        در حال بارگذاری گزارش سفارشات…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
    );
  }

  return data ? <OrdersAnalyticsDashboard data={data} periodDays={periodDays} /> : null;
}
