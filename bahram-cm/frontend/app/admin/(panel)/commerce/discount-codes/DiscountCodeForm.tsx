'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Copy, Loader2, Save, Trash2 } from 'lucide-react';
import { JalaliDateTimeField } from '@/components/admin/JalaliDateTimeField';
import { deleteDiscountCode, saveDiscountCode } from '../../actions';
import type { AdminDiscountCode, AdminDiscountRestriction, AdminDiscountType, AdminProduct } from '@/lib/admin/commerceTypes';
import { DISCOUNT_RESTRICTION_LABELS, DISCOUNT_TYPE_LABELS } from '@/lib/admin/commerceTypes';

function randomCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OFF-${part}`;
}

export function DiscountCodeForm({
  code,
  products,
}: {
  code?: AdminDiscountCode;
  products: AdminProduct[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    code: code?.code ?? randomCode(),
    title: code?.title ?? '',
    description: code?.description ?? '',
    discount_type: (code?.discount_type ?? 'percent') as AdminDiscountType,
    discount_value: code?.discount_value ?? 10,
    is_active: code?.is_active ?? true,
    starts_at: code?.starts_at ?? '',
    ends_at: code?.ends_at ?? '',
    max_uses: code?.max_uses ?? null,
    max_uses_per_user: code?.max_uses_per_user ?? 1,
    min_order_amount: code?.min_order_amount ?? null,
    max_discount_amount: code?.max_discount_amount ?? null,
    requires_link: code?.requires_link ?? false,
    restriction: (code?.restriction ?? 'all') as AdminDiscountRestriction,
    product_ids: code?.product_ids ?? [],
    user_ids: code?.user_ids ?? [],
  });
  const [userIdsText, setUserIdsText] = useState((code?.user_ids ?? []).join(', '));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') {
      return `/?discount=${form.code}`;
    }
    return `${window.location.origin}/?discount=${encodeURIComponent(form.code)}`;
  }, [form.code]);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleProduct(id: number) {
    setForm((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter((pid) => pid !== id)
        : [...prev.product_ids, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');

    const userIds = userIdsText
      .split(/[,\s]+/)
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v) && v > 0);

    const res = await saveDiscountCode(
      {
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_user: form.max_uses_per_user ? Number(form.max_uses_per_user) : null,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_discount_amount: form.max_discount_amount ? Number(form.max_discount_amount) : null,
        requires_link: form.requires_link,
        restriction: form.restriction,
        product_ids: form.product_ids,
        user_ids: userIds,
      },
      code?.id,
    );

    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }
    if (!code?.id && res.id) {
      router.push(`/admin/commerce/discount-codes/${res.id}`);
    }
    router.refresh();
  }

  async function onDelete() {
    if (!code?.id || !confirm('حذف شود؟')) return;
    setPending(true);
    const res = await deleteDiscountCode(code.id);
    setPending(false);
    if (res.ok) {
      router.push('/admin/commerce/discount-codes');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('کپی لینک ناموفق بود.');
    }
  }

  const showProducts =
    form.restriction === 'specific_products' || form.restriction === 'prior_buyers';

  return (
    <form onSubmit={onSubmit} className="card max-w-3xl space-y-6 p-6">
      <section className="space-y-4">
        <h3 className="text-h4">اطلاعات پایه</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">کد تخفیف *</span>
            <div className="flex gap-2">
              <input
                className="field-input font-mono"
                dir="ltr"
                value={form.code}
                onChange={(e) => patch('code', e.target.value.toUpperCase())}
                required
              />
              <button
                type="button"
                className="btn btn-secondary shrink-0"
                onClick={() => patch('code', randomCode())}
              >
                تولید
              </button>
            </div>
          </label>
          <label>
            <span className="field-label">عنوان داخلی *</span>
            <input
              className="field-input"
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
              required
            />
          </label>
        </div>
        <label>
          <span className="field-label">توضیحات</span>
          <textarea
            className="field-input"
            rows={3}
            value={form.description}
            onChange={(e) => patch('description', e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-h4">مقدار تخفیف</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">نوع تخفیف</span>
            <select
              className="field-input"
              value={form.discount_type}
              onChange={(e) => patch('discount_type', e.target.value as AdminDiscountType)}
            >
              {Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">
              {form.discount_type === 'percent' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'}
            </span>
            <input
              className="field-input"
              type="number"
              min={1}
              max={form.discount_type === 'percent' ? 100 : undefined}
              value={form.discount_value}
              onChange={(e) => patch('discount_value', Number(e.target.value))}
              required
            />
          </label>
          {form.discount_type === 'percent' ? (
            <label>
              <span className="field-label">سقف مبلغ تخفیف (تومان)</span>
              <input
                className="field-input"
                type="number"
                min={0}
                value={form.max_discount_amount ?? ''}
                onChange={(e) =>
                  patch('max_discount_amount', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="اختیاری"
              />
            </label>
          ) : null}
          <label>
            <span className="field-label">حداقل مبلغ سفارش (تومان)</span>
            <input
              className="field-input"
              type="number"
              min={0}
              value={form.min_order_amount ?? ''}
              onChange={(e) => patch('min_order_amount', e.target.value ? Number(e.target.value) : null)}
              placeholder="اختیاری"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-h4">زمان‌بندی و محدودیت مصرف</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="field-label">شروع اعتبار</span>
            <JalaliDateTimeField value={form.starts_at} onChange={(v) => patch('starts_at', v)} />
          </label>
          <label>
            <span className="field-label">پایان اعتبار</span>
            <JalaliDateTimeField value={form.ends_at} onChange={(v) => patch('ends_at', v)} />
          </label>
          <label>
            <span className="field-label">حداکثر مصرف کل</span>
            <input
              className="field-input"
              type="number"
              min={1}
              value={form.max_uses ?? ''}
              onChange={(e) => patch('max_uses', e.target.value ? Number(e.target.value) : null)}
              placeholder="نامحدود"
            />
          </label>
          <label>
            <span className="field-label">حداکثر مصرف هر کاربر</span>
            <input
              className="field-input"
              type="number"
              min={1}
              value={form.max_uses_per_user ?? ''}
              onChange={(e) =>
                patch('max_uses_per_user', e.target.value ? Number(e.target.value) : null)
              }
              placeholder="نامحدود"
            />
          </label>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => patch('is_active', e.target.checked)}
          />
          <span className="text-small">فعال</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.requires_link}
            onChange={(e) => patch('requires_link', e.target.checked)}
          />
          <span className="text-small">فقط از طریق لینک اختصاصی (پارامتر ?discount=)</span>
        </label>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h3 className="text-h4">محدودیت مخاطب</h3>
        <label>
          <span className="field-label">نوع محدودیت</span>
          <select
            className="field-input"
            value={form.restriction}
            onChange={(e) => patch('restriction', e.target.value as AdminDiscountRestriction)}
          >
            {Object.entries(DISCOUNT_RESTRICTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {form.restriction === 'specific_users' ? (
          <label>
            <span className="field-label">شناسه دانشجویان (با کاما جدا کنید)</span>
            <input
              className="field-input font-mono"
              dir="ltr"
              value={userIdsText}
              onChange={(e) => setUserIdsText(e.target.value)}
              placeholder="12, 45, 78"
            />
            <span className="mt-1 block text-caption text-muted">
              شناسه‌ها را از صفحه دانشجویان پیدا کنید.
            </span>
            {code?.users?.length ? (
              <ul className="mt-2 space-y-1 text-caption text-muted">
                {code.users.map((user) => (
                  <li key={user.id}>
                    #{user.id} — {user.name} {user.mobile ? `(${user.mobile})` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </label>
        ) : null}

        {showProducts ? (
          <div>
            <span className="field-label">
              {form.restriction === 'prior_buyers'
                ? 'محصولات خرید قبلی (خالی = هر خرید موفق)'
                : 'محصولات مجاز'}
            </span>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
              {products.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-small">
                  <input
                    type="checkbox"
                    checked={form.product_ids.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                  />
                  <span>{product.title}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h3 className="text-h4">لینک اشتراک‌گذاری</h3>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-surface-soft px-3 py-2 text-caption" dir="ltr">
            {shareLink}
          </code>
          <button type="button" className="btn btn-secondary" onClick={() => void copyLink()}>
            <Copy className="h-4 w-4" />
            {copied ? 'کپی شد' : 'کپی لینک'}
          </button>
        </div>
        {code ? (
          <p className="text-caption text-muted">
            تعداد استفاده: {code.uses_count.toLocaleString('fa-IR')}
          </p>
        ) : null}
      </section>

      {error ? <p className="text-small text-error">{error}</p> : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-4">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره
        </button>
        <Link href="/admin/commerce/discount-codes" className="btn btn-secondary">
          بازگشت
        </Link>
        {code?.id ? (
          <button type="button" onClick={() => void onDelete()} className="btn btn-secondary text-error">
            <Trash2 className="h-4 w-4" /> حذف
          </button>
        ) : null}
      </div>
    </form>
  );
}
