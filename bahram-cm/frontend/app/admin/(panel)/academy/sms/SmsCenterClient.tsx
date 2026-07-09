'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink, Inbox, Send, Settings, Zap } from 'lucide-react';
import type { AdminAudienceSegment, AdminSmsLog } from '@/lib/admin/academyTypes';
import { formatDateTime } from '@/lib/admin/academyTypes';
import type { SmsCenterConfig } from '@/lib/admin/smsCenter.types';
import { SMS_EVENT_LABELS } from '@/lib/admin/smsCenter.types';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { SendSmsForm } from './SendSmsForm';
import { SmsEventsPanel } from './SmsEventsPanel';
import { Badge, StatCard, Table } from '../../ui';

type Tab = 'send' | 'events' | 'logs';

const TABS: { id: Tab; label: string; icon: typeof Zap }[] = [
  { id: 'events', label: 'رویدادها', icon: Zap },
  { id: 'send', label: 'ارسال', icon: Send },
  { id: 'logs', label: 'لاگ', icon: ClipboardList },
];

function SmsEmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="admin-sms-hub__empty">
      <span className="admin-sms-hub__empty-icon">{icon}</span>
      <p className="admin-sms-hub__empty-title">{title}</p>
      {description ? <p className="admin-sms-hub__empty-desc">{description}</p> : null}
    </div>
  );
}

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

  const stats = useMemo(() => {
    const events = config?.events ?? [];
    const providers = config?.providers ?? [];
    return {
      eventsEnabled: events.filter((e) => e.is_enabled).length,
      eventsTotal: events.length,
      providersReady: providers.filter((p) => p.configured && p.is_active).length,
      providersTotal: providers.length,
      smsActive: config?.global.is_sms_active ?? false,
      primaryProvider: config?.providers.find((p) => p.slug === config?.global.primary_provider_slug),
      logsTotal: logs.length,
      sentLogs: logs.filter((l) => l.status === 'sent').length,
    };
  }, [config, logs]);

  return (
    <div className="admin-sms-hub">
      <div className="admin-sms-hub__routing card">
        <div className="admin-sms-hub__routing-lead">
          <span className="admin-sms-hub__routing-icon">
            <Settings className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="admin-sms-hub__routing-title">مسیردهی پنل‌ها و fallback</p>
            <p className="admin-sms-hub__routing-desc">
              پنل پیش‌فرض، پنل جایگزین و تأخیر fallback از تنظیمات سایت مدیریت می‌شود.
            </p>
          </div>
        </div>
        <Link href="/admin/settings#sms-routing" className="admin-sms-hub__routing-link">
          تنظیمات سایت
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="admin-dashboard-kpi-grid">
        <StatCard
          label="رویداد فعال"
          value={`${stats.eventsEnabled.toLocaleString('fa-IR')}/${stats.eventsTotal.toLocaleString('fa-IR')}`}
          icon="Zap"
          hint="پیامک خودکار بر اساس رویداد"
          tone="teal"
        />
        <StatCard
          label="پنل آماده"
          value={`${stats.providersReady.toLocaleString('fa-IR')}/${stats.providersTotal.toLocaleString('fa-IR')}`}
          icon="Smartphone"
          hint={stats.primaryProvider?.label_fa ?? 'پنل پیش‌فرض تنظیم نشده'}
          tone="blue"
        />
        <StatCard
          label="وضعیت ارسال"
          value={stats.smsActive ? 'فعال' : 'غیرفعال'}
          icon="MessageSquare"
          hint={stats.smsActive ? 'ارسال خودکار روشن است' : 'ارسال خودکار خاموش است'}
          tone={stats.smsActive ? 'green' : 'amber'}
        />
        <StatCard
          label="لاگ اخیر"
          value={stats.logsTotal.toLocaleString('fa-IR')}
          icon="ClipboardList"
          hint={`${stats.sentLogs.toLocaleString('fa-IR')} ارسال موفق`}
          tone="gold"
        />
      </div>

      <div className="admin-period-toolbar admin-sms-hub__tabs">
        <div className="admin-period-segments">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="admin-period-btn inline-flex items-center gap-2"
              data-active={tab === id ? 'true' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {tab === 'events' && config ? (
          <span className="admin-period-summary">
            {stats.eventsEnabled.toLocaleString('fa-IR')} رویداد فعال
          </span>
        ) : null}
        {tab === 'logs' ? (
          <span className="admin-period-summary">
            {stats.logsTotal.toLocaleString('fa-IR')} رکورد
          </span>
        ) : null}
      </div>

      {tab === 'send' ? (
        <div className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__head">
            <h2 className="admin-dashboard-panel__title">ارسال پیامک هدفمند</h2>
          </div>
          <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
            <SendSmsForm segments={segments} config={config} embedded />
          </div>
        </div>
      ) : null}

      {tab === 'events' ? (
        !config ? (
          <div className="admin-dashboard-panel">
            <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
              <SmsEmptyState
                icon={<Zap className="h-6 w-6" strokeWidth={1.75} />}
                title="بارگذاری تنظیمات ناموفق بود"
                description="صفحه را رفرش کنید یا از بخش تنظیمات سایت پیکربندی را بررسی کنید."
              />
            </div>
          </div>
        ) : (
          <SmsEventsPanel events={config.events} categories={config.event_categories} providers={config.providers} />
        )
      ) : null}

      {tab === 'logs' ? (
        <div className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__head">
            <h2 className="admin-dashboard-panel__title">لاگ ارسال پیامک</h2>
          </div>
          <div className="admin-dashboard-panel__body admin-dashboard-panel__body--padded">
            {logsError ? (
              <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
                {logsError}
              </div>
            ) : null}
            {logs.length > 0 ? (
              <SmsLogsTable logs={logs} />
            ) : (
              <SmsEmptyState
                icon={<Inbox className="h-6 w-6" strokeWidth={1.75} />}
                title="پیامکی ارسال نشده است"
                description="پس از ارسال دستی یا فعال‌سازی رویدادها، لاگ‌ها اینجا نمایش داده می‌شوند."
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SmsLogsTable({ logs }: { logs: AdminSmsLog[] }) {
  return (
    <Table
      head={['شماره', 'رویداد', 'دانشجو', 'متن', 'پنل', 'وضعیت', 'تاریخ']}
      mobile={logs.map((l) => (
        <AdminTableCard
          key={l.id}
          title={
            <span dir="ltr" className="font-mono text-small">
              {l.mobile}
            </span>
          }
          fields={[
            {
              label: 'رویداد',
              value: (
                <>
                  {l.event_key ? SMS_EVENT_LABELS[l.event_key] ?? l.event_key : '—'}
                  {l.is_fallback_attempt ? ' ↺' : ''}
                </>
              ),
            },
            { label: 'دانشجو', value: l.user_name ?? '—' },
            { label: 'متن', value: <span className="line-clamp-2">{l.message}</span> },
            { label: 'پنل', value: l.provider ?? '—' },
            {
              label: 'وضعیت',
              value: (
                <Badge tone={l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'default'}>
                  {l.status}
                </Badge>
              ),
            },
            { label: 'تاریخ', value: formatDateTime(l.created_at) },
          ]}
        />
      ))}
    >
      {logs.map((l) => (
        <tr key={l.id} className="hover:bg-surface-soft/40">
          <td className="whitespace-nowrap px-4 py-3 text-caption" dir="ltr">
            {l.mobile}
          </td>
          <td className="px-4 py-3 text-caption">
            {l.event_key ? SMS_EVENT_LABELS[l.event_key] ?? l.event_key : '—'}
            {l.is_fallback_attempt ? ' ↺' : ''}
          </td>
          <td className="px-4 py-3 text-caption">{l.user_name ?? '—'}</td>
          <td className="max-w-xs truncate px-4 py-3 text-caption">{l.message}</td>
          <td className="px-4 py-3 text-caption">{l.provider ?? '—'}</td>
          <td className="px-4 py-3">
            <Badge tone={l.status === 'sent' ? 'success' : l.status === 'failed' ? 'danger' : 'default'}>
              {l.status}
            </Badge>
          </td>
          <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(l.created_at)}</td>
        </tr>
      ))}
    </Table>
  );
}
