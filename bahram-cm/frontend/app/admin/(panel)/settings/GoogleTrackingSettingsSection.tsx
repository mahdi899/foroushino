'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { BarChart3, Cloud, Search, Upload } from 'lucide-react';
import type { TrackingSettingsForm } from '@/lib/tracking/types';

interface GoogleTrackingSettingsSectionProps {
  form: TrackingSettingsForm;
  hasGa4ServiceAccount: boolean;
  ga4ServiceAccountEmail: string | null;
  hasIndexNowKey: boolean;
  indexNowKeyPreview: string | null;
  envFallback: {
    ga4Property: boolean;
    ga4ServiceAccount: boolean;
    verification: boolean;
    indexNow: boolean;
  };
  onChange: (form: TrackingSettingsForm) => void;
}

export function GoogleTrackingSettingsSection({
  form,
  hasGa4ServiceAccount,
  ga4ServiceAccountEmail,
  hasIndexNowKey,
  indexNowKeyPreview,
  envFallback,
  onChange,
}: GoogleTrackingSettingsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function onJsonFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      onChange({ ...form, ga4ServiceAccountJsonInput: text });
    };
    reader.readAsText(file);
  }

  return (
    <div id="google-tracking" className="card p-6">
      <div className="mb-6 flex items-start gap-3">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 className="text-h3 text-primary-dark">گوگل آنالیتیکس و وبمستر</h2>
          <p className="mt-1 text-small text-text-muted">
            داشبورد GA4 در پنل + Search Console. ردیابی روی سایت از طریق Cloudflare Zaraz انجام می‌شود.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-small font-semibold text-primary-dark">
            <BarChart3 className="h-4 w-4" />
            داشبورد GA4 در پنل ادمین
          </h3>
        </div>

        <label className="flex items-center gap-2 text-small text-text lg:col-span-2">
          <input
            type="checkbox"
            checked={form.ga4DashboardEnabled}
            onChange={(e) => onChange({ ...form, ga4DashboardEnabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          نمایش داده Google Analytics در{' '}
          <Link href="/admin/seo" className="text-primary underline">
            سئو و تحلیل
          </Link>
        </label>

        <div>
          <label className="field-label" htmlFor="ga4-property-id">
            شناسه Property GA4
          </label>
          <input
            id="ga4-property-id"
            value={form.ga4PropertyId}
            onChange={(e) => onChange({ ...form, ga4PropertyId: e.target.value })}
            className="field-input"
            dir="ltr"
            placeholder="123456789"
            disabled={!form.ga4DashboardEnabled}
          />
          <p className="mt-1 text-caption text-text-muted">
            GA4 → Admin → Property settings → Property ID (عدد، نه G-XXXXXXXX)
          </p>
          {envFallback.ga4Property && !form.ga4PropertyId.trim() && (
            <p className="mt-1 text-caption text-text-muted">fallback از env: GA4_PROPERTY_ID</p>
          )}
        </div>

        <div>
          <label className="field-label">کلید Service Account (JSON)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            disabled={!form.ga4DashboardEnabled}
            onChange={(e) => onJsonFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!form.ga4DashboardEnabled}
            className="btn btn-secondary w-full py-2 text-small disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            آپلود فایل JSON
          </button>
          {hasGa4ServiceAccount && !form.ga4ServiceAccountJsonInput && ga4ServiceAccountEmail && (
            <p className="mt-2 text-caption text-success" dir="ltr">
              ذخیره‌شده: {ga4ServiceAccountEmail}
            </p>
          )}
          {envFallback.ga4ServiceAccount && !hasGa4ServiceAccount && !form.ga4ServiceAccountJsonInput && (
            <p className="mt-2 text-caption text-text-muted">fallback از env</p>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="ga4-sa-json">
            یا JSON را اینجا paste کنید
          </label>
          <textarea
            id="ga4-sa-json"
            value={form.ga4ServiceAccountJsonInput}
            onChange={(e) => onChange({ ...form, ga4ServiceAccountJsonInput: e.target.value })}
            className="field-input min-h-[88px] font-mono text-caption"
            dir="ltr"
            placeholder='{"type":"service_account","client_email":"...","private_key":"..."}'
            disabled={!form.ga4DashboardEnabled}
            spellCheck={false}
          />
          <p className="mt-1 text-caption text-text-muted">
            Google Cloud → Service Account → Keys → JSON. در GA4 به این ایمیل نقش Viewer بدهید.
          </p>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-border bg-surface-soft p-3">
          <div className="mb-1 flex items-center gap-2 text-small font-semibold text-primary-dark">
            <Cloud className="h-4 w-4 text-accent" />
            ردیابی روی سایت — Cloudflare Zaraz
          </div>
          <p className="text-caption text-text-muted">
            GA4 روی خود سایت از{' '}
            <a
              href="https://dash.cloudflare.com/?to=/:account/zaraz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Cloudflare Zaraz
            </a>{' '}
            تنظیم می‌شود (جدا از این بخش).
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-small font-semibold text-primary-dark">
            <Search className="h-4 w-4" />
            Google Search Console
          </h3>
        </div>

        <label className="flex items-center gap-2 text-small text-text lg:col-span-2">
          <input
            type="checkbox"
            checked={form.searchConsoleEnabled}
            onChange={(e) => onChange({ ...form, searchConsoleEnabled: e.target.checked })}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          فعال‌سازی متا تگ تأیید مالکیت (HTML tag)
        </label>

        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="gsc-verification">
            کد تأیید google-site-verification
          </label>
          <input
            id="gsc-verification"
            value={form.siteVerificationCode}
            onChange={(e) => onChange({ ...form, siteVerificationCode: e.target.value })}
            className="field-input"
            dir="ltr"
            placeholder="abc123..."
            disabled={!form.searchConsoleEnabled}
          />
          <p className="mt-1 text-caption text-text-muted">
            از Search Console → تنظیمات → مالکیت → HTML tag — فقط مقدار content را وارد کنید.
          </p>
          {envFallback.verification && !form.siteVerificationCode.trim() && (
            <p className="mt-1 text-caption text-text-muted">fallback از env: GOOGLE_SITE_VERIFICATION</p>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="field-label" htmlFor="indexnow-key">
            کلید IndexNow (Bing / Yandex)
          </label>
          <input
            id="indexnow-key"
            type="password"
            value={form.indexNowKeyInput}
            onChange={(e) => onChange({ ...form, indexNowKeyInput: e.target.value })}
            className="field-input"
            dir="ltr"
            placeholder={hasIndexNowKey ? 'برای تغییر، کلید جدید وارد کنید' : 'hex-32-chars...'}
            autoComplete="new-password"
          />
          {hasIndexNowKey && !form.indexNowKeyInput && indexNowKeyPreview && (
            <p className="mt-1 text-caption text-success" dir="ltr">
              ذخیره‌شده: {indexNowKeyPreview}
            </p>
          )}
          {envFallback.indexNow && !hasIndexNowKey && !form.indexNowKeyInput.trim() && (
            <p className="mt-1 text-caption text-text-muted">fallback از env: INDEXNOW_KEY</p>
          )}
          <p className="mt-1 text-caption text-text-muted">
            برای اطلاع‌رسانی خودکار به Bing پس از انتشار مقاله — در آدرس /indexnow.txt سرو می‌شود.
          </p>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_TRACKING_FORM } from '@/lib/tracking/types';
