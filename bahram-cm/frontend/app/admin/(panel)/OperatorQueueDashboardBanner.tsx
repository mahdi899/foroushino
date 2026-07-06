'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useOperatorQueueAlert } from './OperatorQueueAlertContext';
import { toFa } from '@/lib/utils';

export function OperatorQueueDashboardBanner() {
  const pathname = usePathname();
  const { pendingCount } = useOperatorQueueAlert();

  if (pathname !== '/admin' || pendingCount <= 0) return null;

  const label = pendingCount === 1 ? '۱ پیام' : `${toFa(pendingCount)} پیام`;

  return (
    <Link
      href="/admin/chatbot"
      className="admin-alert-warn mb-6 flex animate-admin-queue-blink items-center gap-3 rounded-xl px-4 py-3 text-small font-medium shadow-sm transition hover:opacity-90"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
        <MessageSquare className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">چت جدید در صف اپراتور</span>
        <span className="mt-0.5 block text-caption font-normal opacity-90">
          {label} منتظر پاسخ — برای پاسخ‌دهی سریع کلیک کنید
        </span>
      </span>
      <span className="shrink-0 text-caption font-semibold text-accent">رفتن به چت‌بات ←</span>
    </Link>
  );
}
