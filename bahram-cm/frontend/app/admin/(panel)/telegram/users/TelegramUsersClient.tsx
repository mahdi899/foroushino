'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Table } from '../../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  grantTelegramBotAdminByTelegramIdAction,
  toggleTelegramAccountBlockAction,
  toggleTelegramBotAdminAction,
  unlinkTelegramAccountAction,
} from '../actions';
import type { TelegramAccountView } from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

export function TelegramUsersClient({
  items,
  meta,
  search: initialSearch,
}: {
  items: TelegramAccountView[];
  meta: { total: number };
  search?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch ?? '');
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? 'انجام شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  const actions = (a: TelegramAccountView) => (
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => toggleTelegramAccountBlockAction(a.id, !a.is_blocked))}>
        {a.is_blocked ? 'رفع مسدودیت' : 'مسدود'}
      </button>
      <button type="button" disabled={pending || !!a.is_permanent_bot_admin} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => toggleTelegramBotAdminAction(a.id, !a.is_bot_admin, 'simple'))}>
        {a.is_bot_admin ? 'حذف ادمین' : 'ادمین ساده'}
      </button>
      {!a.is_bot_admin || a.bot_admin_rank !== 'super' ? (
        <button type="button" disabled={pending || !!a.is_permanent_bot_admin} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => toggleTelegramBotAdminAction(a.id, true, 'super'))}>
          ادمین برتر
        </button>
      ) : null}
      {a.is_linked ? (
        <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => unlinkTelegramAccountAction(a.id))}>
          قطع اتصال
        </button>
      ) : null}
    </div>
  );

  return (
    <AdminContentPanel title="کاربران ربات و نقش ادمین" summary={<span>{toFa(meta.total)} کاربر</span>}>
      <p className="mb-4 text-small text-text-muted leading-relaxed">
        ادمین ساده دسترسی عملیاتی دارد؛ فقط ادمین برتر می‌تواند دیگران را ادمین کند.
      </p>

      <AddBotAdminByIdForm onSaved={() => router.refresh()} disabled={pending} />

      <div className="mb-4 flex flex-wrap gap-2">
        {[7, 14, 30].map((days) => (
          <a key={days} className="btn btn-secondary text-caption px-2 py-1" href={`/api/admin/telegram/accounts-export?days=${days}`}>
            خروجی TXT — {days} روز
          </a>
        ))}
      </div>
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = search.trim();
          router.push(q ? `/admin/telegram/users?search=${encodeURIComponent(q)}` : '/admin/telegram/users');
        }}
      >
        <input className="field-input min-w-[12rem] flex-1" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو: نام، موبایل، آیدی تلگرام..." />
        <button type="submit" className="btn btn-secondary">جستجو</button>
      </form>

      {msg ? <p className="mb-3 text-small text-text-muted">{msg}</p> : null}

      {items.length === 0 ? (
        <p className="text-center text-small text-text-muted py-8">کاربری یافت نشد.</p>
      ) : (
        <Table
          head={['کاربر', 'تلگرام', 'موبایل', 'وضعیت', 'عملیات']}
          mobile={items.map((a) => (
            <AdminTableCard
              key={a.id}
              title={a.display_name || a.first_name || `کاربر ${a.telegram_user_id}`}
              fields={[
                { label: 'تلگرام', value: a.telegram_username ? `@${a.telegram_username}` : toFa(a.telegram_user_id), mono: true },
                { label: 'موبایل', value: a.mobile ?? a.mobile_masked ?? '—', mono: true },
                {
                  label: 'وضعیت',
                  value: (
                    <span className="inline-flex flex-wrap gap-1">
                      <Badge tone={a.is_blocked ? 'danger' : a.is_linked ? 'success' : 'warning'}>{a.is_blocked ? 'مسدود' : a.is_linked ? 'متصل' : 'ثبت‌نام'}</Badge>
                      {a.is_bot_admin ? (
                        <Badge tone="accent">
                          {a.is_permanent_bot_admin ? 'ادمین دائمی' : a.bot_admin_rank === 'super' ? 'ادمین برتر' : 'ادمین ساده'}
                        </Badge>
                      ) : null}
                    </span>
                  ),
                },
              ]}
              footer={actions(a)}
            />
          ))}
        >
          {items.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{a.display_name || a.first_name || '—'}</p>
                <p className="text-caption text-text-muted">{a.user_name ?? 'بدون حساب سایت'}</p>
              </td>
              <td className="px-4 py-3 text-text-muted" dir="ltr">
                {a.telegram_username ? `@${a.telegram_username}` : toFa(a.telegram_user_id)}
              </td>
              <td className="px-4 py-3 text-text-muted" dir="ltr">{a.mobile ?? a.mobile_masked ?? '—'}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={a.is_blocked ? 'danger' : a.is_linked ? 'success' : 'warning'}>
                    {a.is_blocked ? 'مسدود' : a.is_linked ? 'متصل' : 'ثبت‌نام'}
                  </Badge>
                  {a.is_bot_admin ? (
                    <Badge tone="accent">
                      {a.is_permanent_bot_admin ? 'ادمین دائمی' : a.bot_admin_rank === 'super' ? 'ادمین برتر' : 'ادمین ساده'}
                    </Badge>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">{actions(a)}</td>
            </tr>
          ))}
        </Table>
      )}
    </AdminContentPanel>
  );
}

function AddBotAdminByIdForm({ onSaved, disabled }: { onSaved: () => void; disabled: boolean }) {
  const [telegramUserId, setTelegramUserId] = useState('');
  const [rank, setRank] = useState<'simple' | 'super'>('simple');
  const [displayName, setDisplayName] = useState('');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const save = () => {
    const id = Number(telegramUserId.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setStatus('آیدی عددی تلگرام را درست وارد کنید.');
      return;
    }

    startTransition(async () => {
      setStatus(null);
      const res = await grantTelegramBotAdminByTelegramIdAction({
        telegram_user_id: id,
        bot_admin_rank: rank,
        display_name: displayName.trim() || undefined,
      });
      if (!res.ok) {
        setStatus(res.error ?? 'خطا');
        return;
      }

      setStatus('ادمین بات ثبت شد.');
      setTelegramUserId('');
      setDisplayName('');
      onSaved();
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-border p-4">
      <p className="text-small font-semibold text-text">افزودن ادمین با آیدی تلگرام</p>
      <p className="mt-1 text-caption text-text-muted">
        اگر کاربر هنوز /start نزده، رکورد ساخته می‌شود و با ورود به ربات، منوی ادمین برایش فعال است.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-caption text-text-muted">آیدی عددی تلگرام</span>
          <input
            className="field-input mt-1 w-full"
            dir="ltr"
            inputMode="numeric"
            placeholder="303360676"
            value={telegramUserId}
            onChange={(e) => setTelegramUserId(e.target.value.replace(/[^\d]/g, ''))}
          />
        </label>
        <label className="block">
          <span className="text-caption text-text-muted">نقش</span>
          <select className="field-input mt-1 w-full" value={rank} onChange={(e) => setRank(e.target.value as 'simple' | 'super')}>
            <option value="simple">ادمین ساده</option>
            <option value="super">ادمین برتر</option>
          </select>
        </label>
        <label className="block">
          <span className="text-caption text-text-muted">نام نمایشی (اختیاری)</span>
          <input
            className="field-input mt-1 w-full"
            placeholder="مثلاً پشتیبانی"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || pending || !telegramUserId.trim()}
          className="btn btn-primary text-caption px-3 py-1.5"
          onClick={() => void save()}
        >
          افزودن ادمین
        </button>
        {status ? <span className="text-caption text-text-muted">{status}</span> : null}
      </div>
    </div>
  );
}
