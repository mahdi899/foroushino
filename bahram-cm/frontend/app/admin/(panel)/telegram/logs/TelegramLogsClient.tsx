'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Table } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminUnderlineTabBar } from '@/components/admin/layout/AdminTabBar';
import { retryFailedTelegramUpdatesAction } from '../actions';
import type {
  TelegramDeliveryLogView,
  TelegramDestinationLeaveEventView,
  TelegramUpdateLogView,
} from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

type Tab = 'updates' | 'delivery' | 'leaves';

export function TelegramLogsClient({
  updates,
  updatesMeta,
  deliveryLogs,
  deliveryMeta,
  leaveEvents,
  leaveMeta,
}: {
  updates: TelegramUpdateLogView[];
  updatesMeta: { total: number };
  deliveryLogs: TelegramDeliveryLogView[];
  deliveryMeta: { total: number };
  leaveEvents: TelegramDestinationLeaveEventView[];
  leaveMeta: { total: number };
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
          { id: 'leaves', label: `لفت‌ها (${toFa(leaveMeta.total)})` },
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
      ) : null}

      {tab === 'delivery' ? (
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
      ) : null}

      {tab === 'leaves' ? (
        <AdminContentPanel
          title="لفت از مقاصد / مرجع"
          summary={<span>{toFa(leaveMeta.total)} رکورد</span>}
        >
          {leaveEvents.length === 0 ? (
            <p className="py-6 text-center text-small text-text-muted">لفتی ثبت نشده.</p>
          ) : (
            <Table head={['کاربر', 'موبایل', 'مقصد', 'وضعیت', 'آزادسازی', 'زمان']}>
              {leaveEvents.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3">{e.user_name ?? `user#${e.user_id}`}</td>
                  <td className="px-4 py-3 text-text-muted dir-ltr text-left">{e.user_mobile ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted">{e.destination_title ?? `#${e.telegram_destination_id}`}</td>
                  <td className="px-4 py-3"><Badge tone="warning">{e.previous_status ?? 'left'}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge tone={e.account_released ? 'success' : 'danger'}>
                      {e.account_released ? 'بله' : 'خیر'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {e.detected_at ? new Date(e.detected_at).toLocaleString('fa-IR') : '—'}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </AdminContentPanel>
      ) : null}

      {msg ? <p className="text-small text-text-muted">{msg}</p> : null}
    </div>
  );
}
