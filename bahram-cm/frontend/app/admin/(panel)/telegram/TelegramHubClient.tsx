'use client';

import Link from 'next/link';
import { ExternalLink, Loader2, Power, RefreshCw, Send, UploadCloud } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '../ui';
import { Badge } from '../ui';
import { TelegramModuleCard } from './TelegramModuleCard';
import { TELEGRAM_MODULE_GROUPS, TELEGRAM_MODULES } from './telegramModules';
import { pushTelegramHostSyncAction, updateTelegramBotAction } from './actions';
import type { TelegramBotView, TelegramHealthSnapshot, TelegramModule } from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

function filterModules(modules: TelegramModule[], permissions: string[], isSuperAdmin: boolean) {
  if (isSuperAdmin) return modules;
  return modules.filter((m) => permissions.includes(m.permission));
}

export function TelegramHubClient({
  health: initialHealth,
  bots,
  permissions,
  isSuperAdmin,
}: {
  health: TelegramHealthSnapshot | null;
  bots: TelegramBotView[];
  permissions: string[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [health, setHealth] = useState(initialHealth);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canManage = isSuperAdmin || permissions.includes('telegram.settings.manage');
  const productionBot = bots.find((b) => b.key === 'production') ?? bots[0] ?? null;

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

  const runPush = () => {
    startTransition(async () => {
      setActionMsg(null);
      const res = await pushTelegramHostSyncAction({ scope: 'full', limit: 120 });
      if (res.ok) {
        const pushed = res.accounts_pushed != null ? ` · ${toFa(res.accounts_pushed)} اکانت` : '';
        setActionMsg((res.message ?? 'پوش انجام شد.') + pushed);
        router.refresh();
      } else {
        setActionMsg(res.error ?? res.message ?? 'پوش ناموفق بود.');
      }
    });
  };

  const toggleBot = () => {
    if (!productionBot) return;
    startTransition(async () => {
      setActionMsg(null);
      const res = await updateTelegramBotAction(productionBot.id, { is_active: !productionBot.is_active });
      setActionMsg(res.ok
        ? (productionBot.is_active ? 'ربات برای کاربران غیرفعال شد. ادمین‌های بات همچنان دسترسی دارند.' : 'ربات فعال شد و به هاست همگام می‌شود.')
        : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

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
              کاربران و ادمین بات، پروفایل تلگرام، پیام همگانی، کانال اجباری و پشتیبانی — همه از همین بخش.
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

      {productionBot ? (
        <div className="admin-telegram-hub__tips card">
          <div className="admin-telegram-hub__tips-head">
            <span className="admin-telegram-hub__tips-icon">
              <Power className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="admin-telegram-hub__tips-title">وضعیت و همگام‌سازی</p>
              <p className="mt-1 text-caption text-text-muted">
                {productionBot.display_name} ·{' '}
                <Badge tone={productionBot.is_active ? 'success' : 'default'}>
                  {productionBot.is_active ? 'فعال برای کاربران' : 'غیرفعال برای کاربران'}
                </Badge>
                {' '}— ادمین‌های بات (از{' '}
                <Link href="/admin/telegram/users" className="text-primary underline-offset-2 hover:underline">
                  کاربران
                </Link>
                ) حتی وقتی ربات خاموش است می‌توانند تست و تنظیم کنند.
              </p>
            </div>
          </div>
          {canManage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void toggleBot()}
                className={productionBot.is_active ? 'btn btn-secondary text-small' : 'btn btn-primary text-small'}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                {productionBot.is_active ? 'خاموش کردن ربات' : 'روشن کردن ربات'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => void runPush()}
                className="btn btn-primary text-small"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                پوش دستی به هاست خارج
              </button>
              <Link href="/admin/telegram/settings" className="btn btn-secondary text-small">
                تنظیمات کامل
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-small text-text-muted">
              برای خاموش/روشن کردن ربات یا پوش دستی، دسترسی «مدیریت تنظیمات تلگرام» لازم است.
            </p>
          )}
          {actionMsg ? <p className="mt-3 text-small text-text-muted">{actionMsg}</p> : null}
        </div>
      ) : null}

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
            <Link href="/admin/telegram/users" className="text-primary underline-offset-2 hover:underline">کاربران و ادمین‌های بات</Link>
            <span>از ستون عملیات، مخاطب را «ادمین بات» کنید</span>
          </li>
          <li>
            <Link href="/admin/telegram/bot-profile" className="text-primary underline-offset-2 hover:underline">پروفایل بات</Link>
            <span>نام و توضیحات بات را در تلگرام عوض کنید</span>
          </li>
          <li>
            <code>php artisan telegram:webhook:set</code>
            <span>تنظیم وب‌هوک روی سرور</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
