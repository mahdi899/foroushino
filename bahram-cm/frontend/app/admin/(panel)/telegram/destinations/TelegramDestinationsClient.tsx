'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '../../ui';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import {
  saveTelegramDestinationAction,
  deleteTelegramDestinationAction,
  saveTelegramDestinationRequirementAction,
  deleteTelegramDestinationRequirementAction,
} from '../actions';
import type { TelegramBotView, TelegramDestinationView } from '@/lib/admin/telegram.types';
import type { AdminProduct } from '@/lib/admin/commerceTypes';

const ACCESS_MODE_LABELS: Record<string, string> = {
  join_request: 'لینک مشترک (Join Request)',
  requirements: 'لینک مشترک (Join Request)',
  shared: 'لینک مشترک',
  per_user: 'لینک اختصاصی هر کاربر',
  per_user_join_request: 'لینک اختصاصی هر کاربر',
};

function productTitle(products: AdminProduct[], productId: string | null | undefined): string {
  if (!productId) return '—';
  const product = products.find((p) => String(p.id) === String(productId));
  return product?.title ?? `محصول #${productId}`;
}

export function TelegramDestinationsClient({
  items,
  bots,
  products,
}: {
  items: TelegramDestinationView[];
  bots: TelegramBotView[];
  products: AdminProduct[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    bot_key: bots[0]?.key ?? 'production',
    title: '',
    chat_id: '',
    username: '',
    join_request_url: '',
    access_mode: 'per_user',
    product_id: '',
    is_active: true,
  });

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active !== false),
    [products],
  );

  const save = () => {
    startTransition(async () => {
      const requirements = form.product_id
        ? [{ requirement_type: 'product', requirement_value: form.product_id }]
        : undefined;

      const res = await saveTelegramDestinationAction({
        bot_key: form.bot_key,
        title: form.title,
        chat_id: form.chat_id,
        username: form.username || undefined,
        join_request_url: form.join_request_url || undefined,
        access_mode: form.access_mode,
        is_active: form.is_active,
        requirements,
      });
      setMsg(res.ok ? 'مقصد ذخیره شد.' : res.error ?? 'خطا');
      if (res.ok) {
        setForm((f) => ({
          ...f,
          title: '',
          chat_id: '',
          username: '',
          join_request_url: '',
          product_id: '',
        }));
        router.refresh();
      }
    });
  };

  const updateDestination = (destination: TelegramDestinationView, patch: Partial<TelegramDestinationView>) => {
    startTransition(async () => {
      const res = await saveTelegramDestinationAction({
        id: destination.id,
        bot_key: destination.bot_key ?? bots[0]?.key ?? 'production',
        title: destination.title,
        chat_id: destination.chat_id,
        username: destination.username ?? undefined,
        join_request_url: destination.join_request_url ?? undefined,
        access_mode: patch.access_mode ?? destination.access_mode,
        is_active: patch.is_active ?? destination.is_active,
      });
      setMsg(res.ok ? 'به‌روزرسانی شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  const addRequirement = (destinationId: number, productId: string) => {
    if (!productId) return;
    startTransition(async () => {
      const res = await saveTelegramDestinationRequirementAction(destinationId, {
        requirement_type: 'product',
        requirement_value: productId,
      });
      setMsg(res.ok ? 'شرط دسترسی اضافه شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
    });
  };

  const removeRequirement = (destinationId: number, requirementId: number) => {
    startTransition(async () => {
      const res = await deleteTelegramDestinationRequirementAction(destinationId, requirementId);
      setMsg(res.ok ? 'شرط حذف شد.' : res.error ?? 'خطا');
      if (res.ok) router.refresh();
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
      <AdminContentPanel
        title="راهنمای سریع"
        summary={<span>گروه پشتیبانی محصول</span>}
      >
        <div className="space-y-2 text-small text-text-muted">
          <p>۱. یک گروه/کانال خصوصی بسازید و ربات را ادمین کنید (با دسترسی تأیید درخواست عضویت).</p>
          <p>۲. Chat ID گروه و محصول مرتبط (مثلاً سات یا کمپین‌نویسی) را اینجا ثبت کنید.</p>
          <p>۳. حالت «لینک اختصاصی هر کاربر» را انتخاب کنید تا ربات برای هر خریدار لینک جدا بسازد.</p>
          <p>۴. کاربر پس از خرید، در بخش «دوره‌ها» یا «حساب من» دکمه ورود به گروه پشتیبانی را می‌بیند.</p>
        </div>
      </AdminContentPanel>

      <AdminContentPanel title="افزودن گروه پشتیبانی محصول">
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
            <span className="text-caption text-text-muted">عنوان (مثلاً گروه پشتیبانی سات)</span>
            <input className="field-input mt-1 w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">Chat ID گروه</span>
            <input className="field-input mt-1 w-full" dir="ltr" placeholder="-100xxxxxxxxxx" value={form.chat_id} onChange={(e) => setForm((f) => ({ ...f, chat_id: e.target.value }))} />
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">محصول مرتبط</span>
            <select className="field-input mt-1 w-full" value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}>
              <option value="">انتخاب محصول…</option>
              {activeProducts.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.title}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">نوع لینک عضویت</span>
            <select className="field-input mt-1 w-full" value={form.access_mode} onChange={(e) => setForm((f) => ({ ...f, access_mode: e.target.value }))}>
              <option value="per_user">لینک اختصاصی هر کاربر (پیشنهادی)</option>
              <option value="join_request">لینک مشترک + Join Request</option>
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">لینک پشتیبان (اختیاری)</span>
            <input className="field-input mt-1 w-full" dir="ltr" placeholder="https://t.me/+..." value={form.join_request_url} onChange={(e) => setForm((f) => ({ ...f, join_request_url: e.target.value }))} />
          </label>
        </div>
        <button
          type="button"
          disabled={pending || !form.title || !form.chat_id || !form.product_id}
          className="btn btn-primary mt-4"
          onClick={save}
        >
          ذخیره مقصد
        </button>
        {msg ? <p className="mt-3 text-small text-text-muted">{msg}</p> : null}
      </AdminContentPanel>

      <AdminContentPanel title="مقاصد ثبت‌شده" summary={<span>{items.length} مورد</span>}>
        {items.length === 0 ? (
          <p className="py-6 text-center text-small text-text-muted">مقصدی ثبت نشده.</p>
        ) : (
          <div className="space-y-3">
            {items.map((d) => {
              const expanded = expandedId === d.id;
              const requirements = d.requirements ?? [];

              return (
                <div key={d.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.title}</p>
                      <p className="text-caption text-text-muted" dir="ltr">{d.chat_id}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {ACCESS_MODE_LABELS[d.access_mode] ?? d.access_mode}
                        {' · '}
                        {requirements.length} شرط دسترسی
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.is_active ? 'success' : 'default'}>{d.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => setExpandedId(expanded ? null : d.id)}>
                        {expanded ? 'بستن' : 'مدیریت'}
                      </button>
                      <button type="button" disabled={pending} className="btn btn-secondary text-caption px-2 py-1" onClick={() => remove(d.id)}>حذف</button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 space-y-3 border-t border-border pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-caption text-text-muted">نوع لینک:</span>
                        <select
                          className="field-input"
                          value={d.access_mode}
                          disabled={pending}
                          onChange={(e) => updateDestination(d, { access_mode: e.target.value })}
                        >
                          <option value="per_user">لینک اختصاصی هر کاربر</option>
                          <option value="join_request">لینک مشترک</option>
                        </select>
                        <button
                          type="button"
                          disabled={pending}
                          className="btn btn-secondary text-caption px-2 py-1"
                          onClick={() => updateDestination(d, { is_active: !d.is_active })}
                        >
                          {d.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                        </button>
                      </div>

                      <div>
                        <p className="mb-2 text-caption font-medium text-text-muted">شرایط دسترسی (خریداران)</p>
                        {requirements.length === 0 ? (
                          <p className="text-caption text-text-muted">هنوز محصولی وصل نشده — درخواست عضویت رد می‌شود.</p>
                        ) : (
                          <ul className="space-y-1">
                            {requirements.map((req) => (
                              <li key={req.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1 text-small">
                                <span>{productTitle(products, req.requirement_value)}</span>
                                <button
                                  type="button"
                                  disabled={pending}
                                  className="text-caption text-danger"
                                  onClick={() => removeRequirement(d.id, req.id)}
                                >
                                  حذف
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select id={`product-${d.id}`} className="field-input" defaultValue="">
                          <option value="">افزودن محصول…</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={String(p.id)}>{p.title}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={pending}
                          className="btn btn-primary text-caption px-2 py-1"
                          onClick={() => {
                            const select = document.getElementById(`product-${d.id}`) as HTMLSelectElement | null;
                            if (select?.value) addRequirement(d.id, select.value);
                          }}
                        >
                          افزودن شرط
                        </button>
                      </div>

                      {d.join_request_url ? (
                        <p className="text-caption text-text-muted" dir="ltr">لینک پشتیبان: {d.join_request_url}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </AdminContentPanel>
    </div>
  );
}
