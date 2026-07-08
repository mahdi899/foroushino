'use client';

import Link from 'next/link';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useOperatorQueueAlert } from './OperatorQueueAlertContext';
import { toFa } from '@/lib/utils';

export function DashboardAlerts() {
  const pathname = usePathname();
  const { pendingCount, ticketPendingCount } = useOperatorQueueAlert();

  if (pathname !== '/admin') return null;
  if (pendingCount <= 0 && ticketPendingCount <= 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {pendingCount > 0 && (
        <Link
          href="/admin/chatbot"
          className="admin-alert-warn flex animate-admin-queue-blink items-center gap-3 rounded-xl px-4 py-3 text-small font-medium shadow-sm transition hover:opacity-90"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <MessageSquare className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">چت جدید در صف اپراتور</span>
            <span className="mt-0.5 block text-caption font-normal opacity-90">
              {pendingCount === 1 ? '۱ پیام' : `${toFa(pendingCount)} پیام`} منتظر پاسخ — برای پاسخ‌دهی سریع کلیک کنید
            </span>
          </span>
          <span className="shrink-0 text-caption font-semibold text-accent">رفتن به چت‌بات ←</span>
        </Link>
      )}

      {ticketPendingCount > 0 && (
        <Link
          href="/admin/academy/tickets"
          className="admin-alert-warn flex items-center gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-small font-medium shadow-sm transition hover:opacity-90"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger text-white">
            <LifeBuoy className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-danger">تیکت پشتیبانی باز</span>
            <span className="mt-0.5 block text-caption font-normal text-text-muted">
              {ticketPendingCount === 1 ? '۱ تیکت' : `${toFa(ticketPendingCount)} تیکت`} در انتظار پاسخ اپراتور
            </span>
          </span>
          <span className="shrink-0 text-caption font-semibold text-accent">مرکز تیکت ←</span>
        </Link>
      )}
    </div>
  );
}
