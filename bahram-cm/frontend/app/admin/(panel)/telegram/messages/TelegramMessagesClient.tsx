'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { Badge, Table } from '../../ui';
import { resetTelegramBotMessageAction, saveTelegramBotMessageAction } from '../actions';
import type { TelegramBotMessageView, TelegramBotView } from '@/lib/admin/telegram.types';

export function TelegramMessagesClient({
  items,
  bots,
}: {
  items: TelegramBotMessageView[];
  bots: TelegramBotView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [botKey, setBotKey] = useState(bots[0]?.key ?? '');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const startEdit = (row: TelegramBotMessageView) => {
    setEditing(row.key);
    setDraft(row.body);
  };

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveTelegramBotMessageAction(editing, draft, botKey || undefined);
      setMsg(res.ok ? 'ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setEditing(null);
        router.refresh();
      }
    });
  };

  const reset = (key: string) => {
    startTransition(async () => {
      const res = await resetTelegramBotMessageAction(key, botKey || undefined);
      setMsg(res.ok ? 'به پیش‌فرض برگشت.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="پیام‌های کاربرمحور بات">
        <label className="mb-4 block max-w-sm">
          <span className="text-caption text-text-muted">ربات</span>
          <select className="field-input mt-1 w-full" value={botKey} onChange={(e) => setBotKey(e.target.value)}>
            {bots.map((b) => (
              <option key={b.id} value={b.key}>{b.display_name}</option>
            ))}
          </select>
        </label>

        {items.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">پیامی ثبت نشده.</p>
        ) : (
          <Table head={['پیام', 'دسته', 'وضعیت', 'عملیات']}>
            {items.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3">
                  <p className="font-medium">{row.label}</p>
                  <p className="mt-1 text-caption text-text-muted line-clamp-2">{row.body}</p>
                  {editing === row.key ? (
                    <div className="mt-3 grid gap-2">
                      <textarea className="field-input min-h-28 w-full" value={draft} onChange={(e) => setDraft(e.target.value)} />
                      <div className="flex gap-2">
                        <button type="button" disabled={pending} className="btn btn-primary text-caption px-2 py-1" onClick={save}>ذخیره</button>
                        <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => setEditing(null)}>لغو</button>
                      </div>
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-text-muted">{row.category}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.is_custom ? 'accent' : 'default'}>{row.is_custom ? 'سفارشی' : 'پیش‌فرض'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => startEdit(row)}>ویرایش</button>
                    {row.is_custom ? (
                      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => reset(row.key)}>پیش‌فرض</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {msg ? <p className="mt-3 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>
    </div>
  );
}
