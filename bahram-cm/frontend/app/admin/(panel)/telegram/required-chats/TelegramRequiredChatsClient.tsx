'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { saveTelegramRequiredChatAction, deleteTelegramRequiredChatAction } from '../actions';
import type { TelegramBotView, TelegramRequiredChatView } from '@/lib/admin/telegram.types';

export function TelegramRequiredChatsClient({
  items,
  bots,
}: {
  items: TelegramRequiredChatView[];
  bots: TelegramBotView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const defaultBot = bots[0]?.key ?? 'production';
  const [form, setForm] = useState({
    bot_key: defaultBot,
    chat_id: '',
    title: '',
    invite_link: '',
    is_required: true,
    is_active: true,
    sort_order: items.length,
  });

  const save = () => {
    startTransition(async () => {
      const res = await saveTelegramRequiredChatAction(form);
      setMsg(res.ok ? 'کانال ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setForm((f) => ({ ...f, chat_id: '', title: '', invite_link: '' }));
        router.refresh();
      }
    });
  };

  const remove = (id: number) => {
    startTransition(async () => {
      const res = await deleteTelegramRequiredChatAction(id);
      setMsg(res.ok ? 'حذف شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="افزودن کانال اجباری">
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
            <span className="text-caption text-text-muted">Chat ID</span>
            <input className="field-input mt-1 w-full" dir="ltr" placeholder="@channel_username یا -1001234567890" value={form.chat_id} onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))} />
            <span className="mt-1 block text-caption text-text-muted">ربات باید در کانال ادمین باشد. Chat ID: @username یا -100… — از لینک t.me/… هم قابل استخراج است.</span>
          </label>
          <label className="block md:col-span-2">
            <span className="text-caption text-text-muted">عنوان</span>
            <input className="field-input mt-1 w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="block md:col-span-2">
            <span className="text-caption text-text-muted">لینک دعوت</span>
            <input className="field-input mt-1 w-full" dir="ltr" value={form.invite_link} onChange={(e) => setForm((f) => ({ ...f, invite_link: e.target.value }))} />
          </label>
        </div>
        <button type="button" disabled={pending || !form.chat_id || !form.title} className="btn btn-primary mt-4" onClick={save}>ذخیره کانال</button>
        {msg ? <p className="mt-3 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>

      <AdminContentPanel title="کانال‌های ثبت‌شده" summary={<span>{items.length} مورد</span>}>
        {items.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">کانالی ثبت نشده.</p>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-caption text-text-muted" dir="ltr">{c.chat_id} · {c.bot_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.is_active ? 'success' : 'default'}>{c.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                  <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => remove(c.id)}>حذف</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminContentPanel>
    </div>
  );
}
