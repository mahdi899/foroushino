'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { saveTelegramDestinationAction, deleteTelegramDestinationAction } from '../actions';
import type { TelegramBotView, TelegramDestinationView } from '@/lib/admin/telegram.types';

export function TelegramDestinationsClient({
  items,
  bots,
}: {
  items: TelegramDestinationView[];
  bots: TelegramBotView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    bot_key: bots[0]?.key ?? 'production',
    title: '',
    chat_id: '',
    username: '',
    join_request_url: '',
    is_active: true,
  });

  const save = () => {
    startTransition(async () => {
      const res = await saveTelegramDestinationAction(form);
      setMsg(res.ok ? 'مقصد ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setForm((f) => ({ ...f, title: '', chat_id: '', username: '', join_request_url: '' }));
        router.refresh();
      }
    });
  };

  const remove = (id: number) => {
    startTransition(async () => {
      const res = await deleteTelegramDestinationAction(id);
      setMsg(res.ok ? 'حذف شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="افزودن مقصد">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-caption text-text-muted">ربات</span>
            <select className="field-input mt-1 w-full" value={form.bot_key} onChange={(e) => setForm((f) => ({ ...f, bot_key: e.target.value }))}>
              {bots.map((b) => (
                <option key={b.id} value={b.key}>{b.display_name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">عنوان</span>
            <input className="field-input mt-1 w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">Chat ID</span>
            <input className="field-input mt-1 w-full" dir="ltr" value={form.chat_id} onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">Username</span>
            <input className="field-input mt-1 w-full" dir="ltr" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-caption text-text-muted">لینک join request</span>
            <input className="field-input mt-1 w-full" dir="ltr" value={form.join_request_url} onChange={(e) => setForm((f) => ({ ...f, join_request_url: e.target.value }))} />
          </label>
        </div>
        <button type="button" disabled={pending || !form.title || !form.chat_id} className="btn btn-primary mt-4" onClick={save}>ذخیره مقصد</button>
        {msg ? <p className="mt-3 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>

      <AdminContentPanel title="مقاصد ثبت‌شده" summary={<span>{items.length} مورد</span>}>
        {items.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">مقصدی ثبت نشده.</p>
        ) : (
          <div className="space-y-3">
            {items.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-caption text-text-muted" dir="ltr">{d.chat_id} · {d.requirements_count} شرط</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={d.is_active ? 'success' : 'default'}>{d.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => remove(d.id)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminContentPanel>
    </div>
  );
}
