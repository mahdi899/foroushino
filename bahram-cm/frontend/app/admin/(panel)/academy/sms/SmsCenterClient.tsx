'use client';

import { useState } from 'react';
import type { AdminAudienceSegment, AdminSmsLog } from '@/lib/admin/academyTypes';
import { formatDateTime } from '@/lib/admin/academyTypes';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';
import { SMS_EVENT_LABELS } from '@/lib/admin/smsCenter.types';
import { SendSmsForm } from './SendSmsForm';
import { SmsEventsPanel } from './SmsEventsPanel';
import { Badge, Table } from '../../ui';

type Tab = 'send' | 'events' | 'logs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'send', label: 'ارسال' },
  { id: 'events', label: 'رویدادها' },
  { id: 'logs', label: 'لاگ' },
];

export function SmsCenterClient({
  segments,
  logs,
  logsError,
  config,
}: {
  segments: AdminAudienceSegment[];
  logs: AdminSmsLog[];
  logsError?: string;
  config: SmsCenterConfig | null;
}) {
  const [tab, setTab] = useState<Tab>('events');

  return (
    <div className="space-y-3">
      <p className="text-caption text-text-muted">
        مسیردهی پنل‌ها و fallback در{' '}
        <a href="/admin/settings#sms-routing" className="text-primary hover:underline">
          تنظیمات سایت
        </a>{' '}
        است.
      </p>

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-pill px-3 py-1.5 text-caption font-medium transition ${
              tab === t.id ? 'bg-primary text-white' : 'bg-surface-soft text-text-muted hover:text-primary-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'send' ? <SendSmsForm segments={segments} config={config} /> : null}

      {tab === 'events' ? (
        !config ? (
          <div className="card p-4 text-caption text-text-muted">بارگذاری تنظیمات رویدادها ناموفق بود.</div>
        ) : (
          <SmsEventsPanel events={config.events} categories={config.event_categories} providers={config.providers} />
        )
      ) : null}

      {tab === 'logs' ? (
        <div>
          {logsError ? (
            <div className="mb-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-caption text-error">{logsError}</div>
          ) : null}
          {logs.length > 0 ? (
            <Table head={['شماره', 'رویداد', 'دانشجو', 'متن', 'پنل', 'وضعیت', 'تاریخ']}>
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-surface-soft/40">
                  <td className="whitespace-nowrap px-3 py-2 text-caption" dir="ltr">
                    {l.mobile}
                  </td>
                  <td className="px-3 py-2 text-caption">
                    {l.event_key ? SMS_EVENT_LABELS[l.event_key] ?? l.event_key : '—'}
                    {l.is_fallback_attempt ? ' ↺' : ''}
                  </td>
                  <td className="px-3 py-2 text-caption">{l.user_name ?? '—'}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-caption">{l.message}</td>
                  <td className="px-3 py-2 text-caption">{l.provider ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge tone={l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'default'}>{l.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-caption">{formatDateTime(l.created_at)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="card p-6 text-center text-caption text-text-muted">پیامکی ارسال نشده است.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
