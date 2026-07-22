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

function requirementLabel(
  products: AdminProduct[],
  requirement: { requirement_type: string; requirement_value?: string | null },
): string {
  if (requirement.requirement_type === 'sat_membership') {
    return 'عضویت فعال سات';
  }

  return productTitle(products, requirement.requirement_value);
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
    requirement_type: 'product' as 'product' | 'sat_membership',
    product_id: '',
    is_active: true,
  });

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active !== false),
    [products],
  );

  const save = () => {
    startTransition(async () => {
      const requirements =
        form.requirement_type === 'sat_membership'
          ? [{ requirement_type: 'sat_membership', requirement_value: 'active' }]
          : form.product_id
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
          requirement_type: 'product',
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

  const addRequirement = (
    destinationId: number,
    requirementType: 'product' | 'sat_membership',
    productId?: string,
  ) => {
    if (requirementType === 'product' && !productId) return;
    startTransition(async () => {
      const res = await saveTelegramDestinationRequirementAction(destinationId, {
        requirement_type: requirementType,
        requirement_value: requirementType === 'sat_membership' ? 'active' : productId,
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
          <p>۱. گروه را بسازید و ربات را ادمین کنید (تأیید درخواست عضویت + ساخت لینک دعوت).</p>
          <p>۲. فقط Chat ID گروه و محصول را ثبت کنید — لینک را ربات خودش می‌سازد و به کاربر می‌دهد.</p>
          <p>۳. لینک اختصاصی: بعد از عضویت کاربر، لینک او از تلگرام حذف می‌شود.</p>
          <p>۴. لینک مشترک: یک لینک برای همه، ولی فقط خریداران همان محصول تأیید می‌شوند.</p>
          <p>۵. برای گروه سات، شرط «عضویت فعال سات» را انتخاب کنید — لینک فقط بعد از تأیید درخواست و فعال شدن دسترسی داده می‌شود.</p>
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
            <span className="text-caption text-text-muted">شرط دسترسی</span>
            <select
              className="field-input mt-1 w-full"
              value={form.requirement_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  requirement_type: e.target.value as 'product' | 'sat_membership',
                  product_id: e.target.value === 'sat_membership' ? '' : f.product_id,
                }))
              }
            >
              <option value="product">خریدار محصول</option>
              <option value="sat_membership">عضویت فعال سات</option>
            </select>
          </label>
          {form.requirement_type === 'product' ? (
            <label className="block">
              <span className="text-caption text-text-muted">محصول مرتبط</span>
              <select className="field-input mt-1 w-full" value={form.product_id} onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}>
                <option value="">انتخاب محصول…</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={String(p.id)}>{p.title}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="text-caption text-text-muted">نوع لینک عضویت</span>
            <select className="field-input mt-1 w-full" value={form.access_mode} onChange={(e) => setForm((f) => ({ ...f, access_mode: e.target.value }))}>
              <option value="per_user">لینک اختصاصی (پس از عضویت حذف می‌شود)</option>
              <option value="join_request">لینک مشترک (فقط اکانت مجاز تأیید می‌شود)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-caption text-text-muted">لینک پشتیبان (اختیاری — معمولاً لازم نیست)</span>
            <input className="field-input mt-1 w-full" dir="ltr" placeholder="https://t.me/+..." value={form.join_request_url} onChange={(e) => setForm((f) => ({ ...f, join_request_url: e.target.value }))} />
          </label>
        </div>
        <button
          type="button"
          disabled={
            pending
            || !form.title
            || !form.chat_id
            || (form.requirement_type === 'product' && !form.product_id)
          }
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
                          <option value="per_user">لینک اختصاصی</option>
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
                        <p className="mb-2 text-caption font-medium text-text-muted">شرایط دسترسی</p>
                        {requirements.length === 0 ? (
                          <p className="text-caption text-text-muted">هنوز شرطی ثبت نشده — درخواست عضویت رد می‌شود.</p>
                        ) : (
                          <ul className="space-y-1">
                            {requirements.map((req) => (
                              <li key={req.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1 text-small">
                                <span>{requirementLabel(products, req)}</span>
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
                        <select id={`requirement-type-${d.id}`} className="field-input" defaultValue="product">
                          <option value="product">خریدار محصول</option>
                          <option value="sat_membership">عضویت فعال سات</option>
                        </select>
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
                            const typeSelect = document.getElementById(`requirement-type-${d.id}`) as HTMLSelectElement | null;
                            const productSelect = document.getElementById(`product-${d.id}`) as HTMLSelectElement | null;
                            const requirementType = (typeSelect?.value ?? 'product') as 'product' | 'sat_membership';
                            if (requirementType === 'sat_membership') {
                              addRequirement(d.id, 'sat_membership');
                              return;
                            }
                            if (productSelect?.value) addRequirement(d.id, 'product', productSelect.value);
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
