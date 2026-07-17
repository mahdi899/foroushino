'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Table } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminUnderlineTabBar } from '@/components/admin/layout/AdminTabBar';
import { retryFailedTelegramUpdatesAction } from '../actions';
import type { TelegramDeliveryLogView, TelegramUpdateLogView } from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

type Tab = 'updates' | 'delivery';

export function TelegramLogsClient({
  updates,
  updatesMeta,
  deliveryLogs,
  deliveryMeta,
}: {
  updates: TelegramUpdateLogView[];
  updatesMeta: { total: number };
  deliveryLogs: TelegramDeliveryLogView[];
  deliveryMeta: { total: number };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('updates');
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const retry = () => {
    startTransition(async () => {
      const res = await retryFailedTelegramUpdatesAction();
      setMsg(res.ok ? `${toFa(res.retried ?? 0)} آپدیت دوباره صف شد.` : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminUnderlineTabBar
        tabs={[
          { id: 'updates', label: `آپدیت‌ها (${toFa(updatesMeta.total)})` },
          { id: 'delivery', label: `Delivery (${toFa(deliveryMeta.total)})` },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'updates' ? (
        <AdminContentPanel
          title="آپدیت‌های ربات"
          summary={<span>{toFa(updatesMeta.total)} رکورد</span>}
          action={
            <button type="button" disabled={pending} className="btn btn-secondary text-small" onClick={retry}>
              تلاش مجدد ناموفق‌ها
            </button>
          }
        >
          {updates.length === 0 ? (
            <p className="py-6 text-center text-small text-text-muted">آپدیتی ثبت نشده.</p>
          ) : (
            <Table head={['نوع', 'وضعیت', 'تلاش', 'خطا', 'زمان']}>
              {updates.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-text-muted">{u.update_type}</td>
                  <td className="px-4 py-3"><Badge tone={u.status === 'failed' ? 'danger' : u.status === 'processed' ? 'success' : 'warning'}>{u.status}</Badge></td>
                  <td className="px-4 py-3 text-text-muted">{toFa(u.attempts)}</td>
                  <td className="px-4 py-3 text-caption text-text-muted max-w-xs truncate">{u.error_message ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{u.received_at ? new Date(u.received_at).toLocaleString('fa-IR') : '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </AdminContentPanel>
      ) : (
        <AdminContentPanel title="Delivery logs" summary={<span>{toFa(deliveryMeta.total)} رکورد</span>}>
          {deliveryLogs.length === 0 ? (
            <p className="py-6 text-center text-small text-text-muted">لاگ delivery ثبت نشده.</p>
          ) : (
            <Table head={['هدف', 'وضعیت', 'خطا', 'زمان']}>
              {deliveryLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 text-text-muted">{l.purpose ?? l.channel}</td>
                  <td className="px-4 py-3"><Badge tone={l.status === 'failed' ? 'danger' : 'success'}>{l.status}</Badge></td>
                  <td className="px-4 py-3 text-caption text-text-muted max-w-xs truncate">{l.error_message ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{l.created_at ? new Date(l.created_at).toLocaleString('fa-IR') : '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </AdminContentPanel>
      )}

      {msg ? <p className="text-small text-text-muted">{msg}</p> : null}
    </div>
  );
}
