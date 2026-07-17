'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Table } from '../../ui';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
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
      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => toggleTelegramBotAdminAction(a.id, !a.is_bot_admin))}>
        {a.is_bot_admin ? 'حذف ادمین بات' : 'ادمین بات'}
      </button>
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
        با دکمه <strong>ادمین بات</strong> می‌توانید به مخاطب دسترسی منوی ادمین داخل ربات بدهید (آمار مخاطبان و لینک پنل).
      </p>
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
                      {a.is_bot_admin ? <Badge tone="accent">ادمین بات</Badge> : null}
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
                  {a.is_bot_admin ? <Badge tone="accent">ادمین بات</Badge> : null}
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
