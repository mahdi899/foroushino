'use client';

import { useMemo, useState } from 'react';
import { Bell, Loader2, Save, Send } from 'lucide-react';
import type { AdminTelegramCategoryView, AdminTelegramEventView, SmsGlobalView } from '@/lib/admin/smsCenter.types';
import { saveAdminTelegramEvent, saveSmsGlobalSettings, testAdminTelegram } from '@/lib/admin/smsCenter';
import { Badge } from '../ui';

const ADMIN_TELEGRAM_CATEGORY_ORDER = ['commerce', 'support', 'users'] as const;

function groupAdminEvents(events: AdminTelegramEventView[]): Map<string, AdminTelegramEventView[]> {
  const map = new Map<string, AdminTelegramEventView[]>();
  for (const event of events) {
    const list = map.get(event.category) ?? [];
    list.push(event);
    map.set(event.category, list);
  }
  return map;
}

function AdminTelegramEventRow({ event }: { event: AdminTelegramEventView }) {
  const [enabled, setEnabled] = useState(event.is_enabled);
  const [pending, setPending] = useState(false);

  async function onToggle(next: boolean) {
    setEnabled(next);
    setPending(true);
    const res = await saveAdminTelegramEvent(event.event_key, { is_enabled: next });
    setPending(false);
    if (!res.ok) {
      setEnabled(!next);
    }
  }

  return (
    <label className="flex cursor-pointer items-start gap-2 px-2.5 py-2 hover:bg-surface-soft/50">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={enabled}
        disabled={pending}
        onChange={(e) => void onToggle(e.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-caption font-medium text-primary-dark">{event.label_fa}</span>
          {pending ? <Loader2 className="h-3 w-3 animate-spin text-text-muted" /> : null}
        </span>
        {event.description ? <span className="mt-0.5 block admin-text-meta text-text-muted">{event.description}</span> : null}
      </span>
    </label>
  );
}

export function AdminTelegramSettingsSection({
  global: initialGlobal,
  events,
  categories,
}: {
  global: SmsGlobalView;
  events: AdminTelegramEventView[];
  categories: AdminTelegramCategoryView[];
}) {
  const [global, setGlobal] = useState(initialGlobal);
  const [globalPending, setGlobalPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState('');

  const grouped = useMemo(() => groupAdminEvents(events), [events]);
  const categoryLabels = useMemo(
    () => new Map(categories.map((c) => [c.key, c.label])),
    [categories],
  );

  async function saveGlobal() {
    setGlobalPending(true);
    setStatus('');
    const res = await saveSmsGlobalSettings({
      admin_telegram_enabled: global.admin_telegram_enabled,
      admin_telegram_chat_ids: global.admin_telegram_chat_ids,
    });
    setGlobalPending(false);
    setStatus(res.ok ? 'ذخیره شد.' : res.error ?? 'خطا');
  }

  async function onTest() {
    setTesting(true);
    setStatus('');

    const saveRes = await saveSmsGlobalSettings({
      admin_telegram_enabled: global.admin_telegram_enabled,
      admin_telegram_chat_ids: global.admin_telegram_chat_ids,
    });

    if (!saveRes.ok) {
      setTesting(false);
      setStatus(saveRes.error ?? 'ذخیره تنظیمات قبل از تست ناموفق بود.');
      return;
    }

    const res = await testAdminTelegram();
    setTesting(false);
    setStatus(res.message);
  }

  return (
    <div id="admin-telegram-logs" className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
        <div>
          <h3 className="text-h3 text-primary-dark">لاگ رویدادها در تلگرام (ادمین)</h3>
          <p className="mt-1 text-caption text-text-muted">
            با ربات تلگرام بالا، رویدادهای کاربران (سفارش، تیکت، ثبت‌نام و …) را به چت ادمین‌ها ارسال کنید. شناسه چت را از{' '}
            <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              @userinfobot
            </a>{' '}
            بگیرید؛ برای گروه از شناسه عددی گروه استفاده کنید.
          </p>
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-caption">
        <input
          type="checkbox"
          checked={global.admin_telegram_enabled}
          onChange={(e) => setGlobal((g) => ({ ...g, admin_telegram_enabled: e.target.checked }))}
        />
        ارسال لاگ رویدادها به تلگرام فعال
      </label>

      <label className="block">
        <span className="field-label text-caption">شناسه چت ادمین‌ها</span>
        <input
          className="field-input text-small"
          dir="ltr"
          placeholder="-1001234567890, 123456789"
          value={global.admin_telegram_chat_ids ?? ''}
          onChange={(e) => setGlobal((g) => ({ ...g, admin_telegram_chat_ids: e.target.value }))}
        />
        <span className="mt-1 block admin-text-meta text-text-muted">چند شناسه را با کاما یا خط جدید جدا کنید.</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveGlobal()} disabled={globalPending} className="btn btn-primary px-3 py-1.5 text-caption">
          {globalPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          ذخیره تنظیمات تلگرام
        </button>
        <button type="button" onClick={() => void onTest()} disabled={testing} className="btn btn-secondary px-3 py-1.5 text-caption">
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          ارسال پیام آزمایشی
        </button>
        {status ? <span className="self-center text-caption text-text-muted">{status}</span> : null}
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        {ADMIN_TELEGRAM_CATEGORY_ORDER.map((categoryKey) => {
          const items = grouped.get(categoryKey);
          if (!items?.length) return null;

          return (
            <div key={categoryKey}>
              <div className="flex items-center justify-between gap-2 bg-surface-soft/60 px-2.5 py-2">
                <p className="text-caption font-bold text-primary-dark">{categoryLabels.get(categoryKey) ?? categoryKey}</p>
                <Badge tone="default">{items.filter((e) => e.is_enabled).length}/{items.length}</Badge>
              </div>
              <div className="divide-y divide-border">
                {items.map((event) => (
                  <AdminTelegramEventRow key={event.event_key} event={event} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
