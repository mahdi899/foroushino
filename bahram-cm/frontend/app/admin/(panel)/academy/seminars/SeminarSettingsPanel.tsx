'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { CoverImageField } from '@/app/admin/(panel)/content/CoverImageField';
import { updateSeminar } from '../actions';
import { formatToman, type AdminSeminarDetail } from '@/lib/admin/academyTypes';

type SeminarSettingsPanelProps = {
  seminar: AdminSeminarDetail;
};

export function SeminarSettingsPanel({ seminar }: SeminarSettingsPanelProps) {
  const router = useRouter();
  const [price, setPrice] = useState(String(seminar.price ?? ''));
  const [salePrice, setSalePrice] = useState(String(seminar.sale_price ?? ''));
  const [capacity, setCapacity] = useState(String(seminar.capacity ?? ''));
  const [status, setStatus] = useState(seminar.status ?? 'draft');
  const [promoEnabled, setPromoEnabled] = useState(seminar.promo_enabled);
  const [bannerAvailable, setBannerAvailable] = useState(seminar.banner_available ?? '');
  const [bannerAvailableMobile, setBannerAvailableMobile] = useState(
    seminar.banner_available_mobile ?? '',
  );
  const [bannerFull, setBannerFull] = useState(seminar.banner_full ?? '');
  const [bannerFullMobile, setBannerFullMobile] = useState(seminar.banner_full_mobile ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const parsedPrice = price.trim() ? Number(price) : null;
    const parsedSale = salePrice.trim() ? Number(salePrice) : null;
    const parsedCapacity = capacity.trim() ? Number(capacity) : null;

    const res = await updateSeminar(seminar.id, {
      price: parsedPrice,
      sale_price: parsedSale,
      capacity: parsedCapacity,
      status,
      promo_enabled: promoEnabled,
      banner_available: bannerAvailable || null,
      banner_available_mobile: bannerAvailableMobile || null,
      banner_full: bannerFull || null,
      banner_full_mobile: bannerFullMobile || null,
    });

    setPending(false);
    if (res.ok) {
      setMessage('تنظیمات ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">فروش و تبلیغ</h2>
        <p className="mt-1 text-small text-text-muted">
          قیمت، ظرفیت و بنرهای تبلیغاتی بالای سایت. وضعیت «منتشر شده» برای فعال شدن خرید و بنر لازم است.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <span className="field-label">قیمت (تومان)</span>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field-input"
            placeholder="مثلاً ۹۹۰۰۰۰"
          />
        </label>
        <label>
          <span className="field-label">قیمت ویژه (تومان)</span>
          <input
            type="number"
            min={0}
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="field-input"
            placeholder="اختیاری"
          />
        </label>
        <label>
          <span className="field-label">ظرفیت</span>
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="field-input"
            placeholder="خالی = نامحدود"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">وضعیت انتشار</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input">
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشر شده</option>
          </select>
        </label>
        <label className="flex items-end gap-3 pb-3">
          <input
            id={`promo-${seminar.id}`}
            type="checkbox"
            checked={promoEnabled}
            onChange={(e) => setPromoEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span className="field-label mb-0">نمایش بنر تبلیغاتی بالای سایت</span>
        </label>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-small font-bold text-text">بنر — ظرفیت موجود</h3>
          <p className="mt-1 text-caption text-text-muted">
            بنر دسکتاپ عریض (۱۹۲۰×۱۲۰) و بنر موبایل (۱۰۸۰×۲۸۰). اگر موبایل خالی باشد، دسکتاپ
            نمایش داده می‌شود.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <CoverImageField
              label="دسکتاپ — ظرفیت موجود"
              value={bannerAvailable}
              onChange={setBannerAvailable}
              alt={`${seminar.title} — ثبت‌نام`}
            />
            <CoverImageField
              label="موبایل — ظرفیت موجود"
              value={bannerAvailableMobile}
              onChange={setBannerAvailableMobile}
              alt={`${seminar.title} — ثبت‌نام (موبایل)`}
            />
          </div>
        </div>

        <div>
          <h3 className="text-small font-bold text-text">بنر — ظرفیت تکمیل</h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <CoverImageField
              label="دسکتاپ — ظرفیت تکمیل"
              value={bannerFull}
              onChange={setBannerFull}
              alt={`${seminar.title} — تکمیل ظرفیت`}
            />
            <CoverImageField
              label="موبایل — ظرفیت تکمیل"
              value={bannerFullMobile}
              onChange={setBannerFullMobile}
              alt={`${seminar.title} — تکمیل ظرفیت (موبایل)`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-small text-text-muted">
        <p>
          ثبت‌نام‌شده: <strong className="text-text">{seminar.attendees_count}</strong>
          {seminar.capacity != null ? (
            <>
              {' '}
              / {seminar.capacity} — باقی‌مانده:{' '}
              <strong className="text-text">{seminar.remaining_seats ?? 0}</strong>
            </>
          ) : null}
          {seminar.is_full ? ' — ظرفیت پر شده' : null}
        </p>
        {seminar.product_slug ? (
          <p className="mt-2">
            صفحه عمومی:{' '}
            <Link href={`/seminars/${seminar.slug}`} className="text-primary hover:underline" target="_blank">
              /seminars/{seminar.slug}
            </Link>
            {' — '}
            لینک پرداخت:{' '}
            <Link href={`/purchase/${seminar.product_slug}`} className="text-primary hover:underline" target="_blank">
              /purchase/{seminar.product_slug}
            </Link>
            {seminar.price ? <> — {formatToman(seminar.sale_price && seminar.sale_price < seminar.price ? seminar.sale_price : seminar.price)}</> : null}
          </p>
        ) : seminar.price ? (
          <p className="mt-2">پس از ذخیره، لینک خرید ساخته می‌شود.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره تنظیمات
        </button>
        {message && <p className="text-small text-success">{message}</p>}
        {error && <p className="text-small text-error">{error}</p>}
      </div>
    </form>
  );
}
