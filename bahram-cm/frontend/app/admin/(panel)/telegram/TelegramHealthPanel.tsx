'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Badge } from '../ui';
import { TelegramCodeList, TelegramInfoPanel } from './TelegramInfoPanel';
import type { TelegramHealthSnapshot } from '@/lib/admin/telegram.types';
import { cn, toFa } from '@/lib/utils';

function StatusBadge({ ok, okLabel, failLabel }: { ok: boolean; okLabel: string; failLabel: string }) {
  return <Badge tone={ok ? 'success' : 'danger'}>{ok ? okLabel : failLabel}</Badge>;
}

export function TelegramHealthPanel({ health: initialHealth }: { health: TelegramHealthSnapshot | null }) {
  const [health, setHealth] = useState(initialHealth);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/telegram/health', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { data: TelegramHealthSnapshot | null };
        setHealth(json.data);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  const botEntries = Object.entries(health?.bots ?? {});

  return (
    <div className="admin-telegram-subpage__stack">
      <div className="admin-telegram-health-toolbar">
        <StatusBadge ok={Boolean(health?.healthy)} okLabel="سیستم سالم" failLabel="نیاز به بررسی" />
        <button type="button" onClick={() => void refresh()} disabled={refreshing} className="admin-telegram-hub__refresh-btn">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          بروزرسانی
        </button>
      </div>

      {!health ? (
        <TelegramInfoPanel icon="Activity" tone="amber" title="بارگذاری وضعیت ناموفق">
          <p className="admin-telegram-info-panel__text">
            اتصال به API برقرار نشد. از CLI دستور <code>php artisan telegram:health-check</code> را اجرا کنید.
          </p>
        </TelegramInfoPanel>
      ) : (
        <>
          <div className="admin-dashboard-kpi-grid">
            <div className={cn('admin-telegram-health-chip', health.database ? 'admin-telegram-health-chip--ok' : 'admin-telegram-health-chip--fail')}>
              <span className="admin-telegram-health-chip__label">پایگاه داده</span>
              <span className="admin-telegram-health-chip__value">{health.database ? 'متصل' : 'قطع'}</span>
            </div>
            <div className="admin-telegram-health-chip admin-telegram-health-chip--neutral">
              <span className="admin-telegram-health-chip__label">آپدیت معلق</span>
              <span className="admin-telegram-health-chip__value">{toFa(health.updates.pending)}</span>
            </div>
            <div className={cn('admin-telegram-health-chip', health.updates.failed === 0 ? 'admin-telegram-health-chip--ok' : 'admin-telegram-health-chip--warn')}>
              <span className="admin-telegram-health-chip__label">آپدیت ناموفق</span>
              <span className="admin-telegram-health-chip__value">{toFa(health.updates.failed)}</span>
            </div>
          </div>

          {botEntries.length > 0 ? (
            <div className="admin-telegram-bot-grid">
              {botEntries.map(([key, bot]) => (
                <div key={key} className="admin-telegram-bot-card card">
                  <div className="admin-telegram-bot-card__head">
                    <span className="admin-telegram-bot-card__key">{key}</span>
                    <StatusBadge ok={bot.token_present && bot.api_reachable} okLabel="آنلاین" failLabel="مشکل" />
                  </div>
                  <ul className="admin-telegram-bot-card__checks">
                    <li>
                      <span>توکن</span>
                      <StatusBadge ok={bot.token_present} okLabel="موجود" failLabel="ندارد" />
                    </li>
                    <li>
                      <span>API</span>
                      <StatusBadge ok={bot.api_reachable} okLabel="در دسترس" failLabel="خطا" />
                    </li>
                    <li className="admin-telegram-bot-card__webhook">
                      <span>وب‌هوک</span>
                      <code dir="ltr">{bot.webhook_url || '—'}</code>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <TelegramInfoPanel icon="Bot" tone="blue" title="رباتی ثبت نشده">
              <p className="admin-telegram-info-panel__text">ابتدا env را تنظیم و سپس sync-bots را اجرا کنید.</p>
            </TelegramInfoPanel>
          )}
        </>
      )}

      <TelegramInfoPanel icon="ClipboardList" tone="teal" title="بررسی از CLI">
        <TelegramCodeList items={[{ code: 'php artisan telegram:health-check', hint: 'گزارش کامل در ترمینال' }]} />
      </TelegramInfoPanel>
    </div>
  );
}
