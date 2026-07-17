'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Table } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  approveTelegramBroadcastAction,
  dispatchTelegramBroadcastAction,
  saveTelegramBroadcastAction,
  sendTelegramBroadcastNowAction,
  stopTelegramBroadcastAction,
} from '../actions';
import type { TelegramBotView, TelegramBroadcastView } from '@/lib/admin/telegram.types';
import { toFa } from '@/lib/utils';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'danger'> = {
  draft: 'default',
  approved: 'accent',
  queued: 'warning',
  finished: 'success',
  stopped: 'danger',
};

export function TelegramBroadcastsClient({
  items,
  meta,
  bots,
}: {
  items: TelegramBroadcastView[];
  meta: { total: number };
  bots: TelegramBotView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    bot_key: bots[0]?.key ?? 'production',
    title: '',
    text: '',
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? 'انجام شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  const create = () => {
    startTransition(async () => {
      const res = await saveTelegramBroadcastAction(form);
      setMsg(res.ok ? 'پیام همگانی ایجاد شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setForm((f) => ({ ...f, title: '', text: '' }));
        router.refresh();
      }
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="ایجاد پیام همگانی">
        <div className="grid gap-3">
          <label className="block">
            <span className="text-caption text-text-muted">ربات</span>
            <select className="field-input mt-1 w-full" value={form.bot_key} onChange={(e) => setForm((f) => ({ ...f, bot_key: e.target.value }))}>
              {bots.map((b) => (
                <option key={b.id} value={b.key}>{b.display_name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">عنوان داخلی</span>
            <input className="field-input mt-1 w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">متن پیام</span>
            <textarea className="field-input mt-1 min-h-28 w-full" value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} />
          </label>
        </div>
        <button type="button" disabled={pending || !form.title || !form.text} className="btn btn-primary mt-4" onClick={create}>ایجاد پیش‌نویس</button>
        {msg ? <p className="mt-3 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>

      <AdminContentPanel title="پیام‌های همگانی" summary={<span>{toFa(meta.total)} مورد</span>}>
        {items.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">پیام همگانی ثبت نشده.</p>
        ) : (
          <Table head={['عنوان', 'وضعیت', 'مخاطب', 'عملیات']}>
            {items.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium">{b.title}</td>
                <td className="px-4 py-3"><Badge tone={STATUS_TONE[b.status] ?? 'default'}>{b.status}</Badge></td>
                <td className="px-4 py-3 text-text-muted">{toFa(b.audience_count)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {b.status === 'draft' ? (
                      <>
                        <button type="button" disabled={pending} className="btn btn-primary text-caption px-2 py-1" onClick={() => run(() => sendTelegramBroadcastNowAction(b.id))}>تأیید و ارسال</button>
                        <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => approveTelegramBroadcastAction(b.id))}>فقط تأیید</button>
                      </>
                    ) : null}
                    {['approved', 'scheduled'].includes(b.status) ? (
                      <button type="button" disabled={pending} className="btn btn-primary text-caption px-2 py-1" onClick={() => run(() => dispatchTelegramBroadcastAction(b.id))}>ارسال</button>
                    ) : null}
                    {!['finished', 'stopped'].includes(b.status) ? (
                      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => run(() => stopTelegramBroadcastAction(b.id))}>توقف</button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </AdminContentPanel>
    </div>
  );
}
