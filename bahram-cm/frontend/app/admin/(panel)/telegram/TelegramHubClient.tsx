'use client';

import Link from 'next/link';
import { ExternalLink, Loader2, RefreshCw, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { StatCard } from '../ui';
import { TelegramModuleCard } from './TelegramModuleCard';
import { TELEGRAM_MODULE_GROUPS, TELEGRAM_MODULES } from './telegramModules';
import type { TelegramHealthSnapshot, TelegramModule } from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

function filterModules(modules: TelegramModule[], permissions: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return modules;
  return modules.filter((m) => permissions.includes(m.permission));
}

export function TelegramHubClient({
  health: initialHealth,
  permissions,
  isSuperAdmin,
}: {
  health: TelegramHealthSnapshot | null;
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  const [health, setHealth] = useState(initialHealth);
  const [refreshing, setRefreshing] = useState(false);

  const modules = filterModules(TELEGRAM_MODULES, permissions, isSuperAdmin);

  const botEntries = Object.entries(health?.bots ?? {});
  const botsWithToken = botEntries.filter(([, b]) => b.token_present).length;
  const botsReachable = botEntries.filter(([, b]) => b.api_reachable).length;
  const pendingUpdates = health?.updates.pending ?? 0;
  const failedUpdates = health?.updates.failed ?? 0;

  const refreshHealth = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/telegram/health', { credentials: 'include' });
      if (res.ok) {
        const json = (await res.json()) as { data: TelegramHealthSnapshot };
        setHealth(json.data);
      }
    } catch {
      /* keep previous snapshot */
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className="admin-telegram-hub">
      <div className="admin-telegram-hub__hero">
        <div className="admin-telegram-hub__hero-lead">
          <span className="admin-telegram-hub__hero-icon">
            <Send className="h-6 w-6" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="admin-telegram-hub__hero-title">مرکز مدیریت ربات تلگرام</h2>
            <p className="admin-telegram-hub__hero-desc">
              وب‌هوک، کاربران متصل، پیام‌های همگانی و پشتیبانی دانشجویان — همه از یکجا.
            </p>
          </div>
        </div>
        <div className="admin-telegram-hub__hero-actions">
          <button
            type="button"
            onClick={() => void refreshHealth()}
            disabled={refreshing}
            className="admin-telegram-hub__refresh-btn"
            title="بروزرسانی وضعیت"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            بروزرسانی
          </button>
          <Link href="/admin/settings#admin-telegram-logs" className="admin-telegram-hub__settings-link">
            اعلان‌های ادمین
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="admin-dashboard-kpi-grid">
        <StatCard
          label="وضعیت کلی"
          value={health ? (health.healthy ? 'سالم' : 'نیاز به بررسی') : '—'}
          icon="ShieldCheck"
          hint={health?.database ? 'پایگاه داده متصل' : 'خطا در اتصال DB'}
          tone={health?.healthy ? 'green' : 'amber'}
          href="/admin/telegram/health"
        />
        <StatCard
          label="ربات فعال"
          value={health ? toFa(botsWithToken) : '—'}
          icon="Bot"
          hint={health ? `${toFa(botEntries.length)} ربات ثبت‌شده` : 'در حال بارگذاری…'}
          tone="blue"
          href="/admin/telegram/settings"
        />
        <StatCard
          label="API تلگرام"
          value={health ? toFa(botsReachable) : '—'}
          icon="Wifi"
          hint="ربات‌های قابل دسترس"
          tone="teal"
          href="/admin/telegram/health"
        />
        <StatCard
          label="آپدیت معلق"
          value={health ? toFa(pendingUpdates) : '—'}
          icon="Clock"
          hint={`${toFa(failedUpdates)} ناموفق`}
          tone={failedUpdates > 0 ? 'amber' : 'gold'}
          href="/admin/telegram/logs"
        />
      </div>

      {TELEGRAM_MODULE_GROUPS.map((group) => {
        const groupModules = modules.filter((m) => m.group === group.id);
        if (groupModules.length === 0) return null;

        return (
          <section key={group.id} className="admin-telegram-hub__section">
            <h2 className="admin-dashboard-section__title">{group.label}</h2>
            <div className="admin-telegram-hub__module-grid">
              {groupModules.map((module) => (
                <TelegramModuleCard key={module.href} module={module} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="admin-telegram-hub__tips card">
        <div className="admin-telegram-hub__tips-head">
          <span className="admin-telegram-hub__tips-icon">
            <Send className="h-4 w-4" strokeWidth={2} />
          </span>
          <p className="admin-telegram-hub__tips-title">راهنمای سریع راه‌اندازی</p>
        </div>
        <ul className="admin-telegram-hub__tips-list">
          <li>
            <code>php artisan telegram:sync-bots</code>
            <span>همگام‌سازی ربات‌ها از env</span>
          </li>
          <li>
            <code>php artisan telegram:webhook:set</code>
            <span>تنظیم وب‌هوک روی سرور</span>
          </li>
          <li>
            <code>php artisan telegram:health-check</code>
            <span>بررسی سلامت از CLI</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
