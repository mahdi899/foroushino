'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { saveTelegramOperatorAction, saveTelegramSupportCategoryAction, deleteTelegramOperatorAction } from '../actions';
import type { TelegramOperatorView, TelegramSupportCategoryView } from '@/lib/admin/telegram.types';

export function TelegramSupportClient({
  categories,
  operators,
}: {
  categories: TelegramSupportCategoryView[];
  operators: TelegramOperatorView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ key: '', title_fa: '', sort_order: categories.length, is_active: true });
  const [opForm, setOpForm] = useState({ telegram_user_id: '', display_name: '', support_role: 'support', is_active: true });

  const saveCategory = () => {
    startTransition(async () => {
      const res = await saveTelegramSupportCategoryAction(catForm);
      setMsg(res.ok ? 'دسته ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setCatForm({ key: '', title_fa: '', sort_order: categories.length + 1, is_active: true });
        router.refresh();
      }
    });
  };

  const saveOperator = () => {
    const id = Number(opForm.telegram_user_id);
    if (!id) return;
    startTransition(async () => {
      const res = await saveTelegramOperatorAction({
        telegram_user_id: id,
        display_name: opForm.display_name || undefined,
        support_role: opForm.support_role,
        is_active: opForm.is_active,
      });
      setMsg(res.ok ? 'اپراتور ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setOpForm({ telegram_user_id: '', display_name: '', support_role: 'support', is_active: true });
        router.refresh();
      }
    });
  };

  const removeOperator = (id: number) => {
    startTransition(async () => {
      const res = await deleteTelegramOperatorAction(id);
      setMsg(res.ok ? 'اپراتور حذف شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  return (
    <div className="admin-telegram-subpage__stack">
      <AdminContentPanel title="دسته‌های پشتیبانی" summary={<span>{categories.length} دسته</span>}>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input className="field-input" placeholder="key (انگلیسی)" dir="ltr" value={catForm.key} onChange={(e) => setCatForm((f) => ({ ...f, key: e.target.value }))} />
          <input className="field-input" placeholder="عنوان فارسی" value={catForm.title_fa} onChange={(e) => setCatForm((f) => ({ ...f, title_fa: e.target.value }))} />
        </div>
        <button type="button" disabled={pending || !catForm.key || !catForm.title_fa} className="btn btn-primary" onClick={saveCategory}>افزودن دسته</button>
        <div className="mt-4 space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{c.title_fa}</p>
                <p className="text-caption text-text-muted" dir="ltr">{c.key}</p>
              </div>
              <Badge tone={c.is_active ? 'success' : 'default'}>{c.is_active ? 'فعال' : 'غیرفعال'}</Badge>
            </div>
          ))}
        </div>
      </AdminContentPanel>

      <AdminContentPanel title="اپراتورهای تلگرام" summary={<span>{operators.length} اپراتور</span>}>
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input className="field-input" placeholder="Telegram User ID" dir="ltr" value={opForm.telegram_user_id} onChange={(e) => setOpForm((f) => ({ ...f, telegram_user_id: e.target.value }))} />
          <input className="field-input" placeholder="نام نمایشی" value={opForm.display_name} onChange={(e) => setOpForm((f) => ({ ...f, display_name: e.target.value }))} />
        </div>
        <button type="button" disabled={pending || !opForm.telegram_user_id} className="btn btn-primary" onClick={saveOperator}>افزودن اپراتور</button>
        <div className="mt-4 space-y-2">
          {operators.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{o.display_name || o.admin_name || `اپراتور ${o.telegram_user_id}`}</p>
                <p className="text-caption text-text-muted" dir="ltr">TG: {o.telegram_user_id} · {o.support_role}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={o.is_active ? 'success' : 'default'}>{o.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => removeOperator(o.id)}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      </AdminContentPanel>

      {msg ? <p className="text-small text-text-muted">{msg}</p> : null}
    </div>
  );
}
