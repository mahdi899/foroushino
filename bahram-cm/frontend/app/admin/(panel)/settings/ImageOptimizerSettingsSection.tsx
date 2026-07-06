'use client';

import { ImageIcon, Loader2, Zap } from 'lucide-react';
import { Badge } from '../ui';
import {
  RESMUSH_QUALITY_OPTIONS,
  normalizeResmushQuality,
  type ImageOptimizerForm,
  type ImageOptimizerView,
} from '@/lib/media/imageOptimizer.types';

type Props = {
  form: ImageOptimizerForm;
  view: ImageOptimizerView | null;
  testing: 'tinify' | 'resmush' | null;
  saving?: boolean;
  onChange: React.Dispatch<React.SetStateAction<ImageOptimizerForm>>;
  onSave?: () => void;
  onTest: (target: 'tinify' | 'resmush') => void;
};

export function ImageOptimizerSettingsSection({
  form,
  view,
  testing,
  saving = false,
  onChange,
  onSave,
  onTest,
}: Props) {
  const tinifyOk = view?.tinify_configured ?? false;
  const resmushOk = view?.resmush_configured ?? false;
  const qualityValue = normalizeResmushQuality(form.resmushQuality);
  const savedQuality = view ? normalizeResmushQuality(view.resmush_quality) : null;
  const qualityDirty = savedQuality !== null && savedQuality !== qualityValue;

  function patch(partial: Partial<ImageOptimizerForm>) {
    onChange((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div id="image-optimizer" className="space-y-6">
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">بهینه‌سازی تصویر (آپلود و گالری)</h2>
              <p className="mt-1 text-small text-text-muted">
                اولویت: <strong>TinyPNG</strong> (نیاز به کلید API) → <strong>reSmush.it</strong> (رایگان، بدون کلید) → GD
                فقط در صورت نبود گزینه دیگر.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex h-full flex-col rounded-lg border border-border bg-surface-soft/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-body font-semibold text-primary-dark">TinyPNG (Tinify)</h3>
                <p className="mt-0.5 text-caption text-text-muted">
                  ۵۰۰ فشرده‌سازی رایگان در ماه —{' '}
                  <a
                    href="https://tinypng.com/developers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                    dir="ltr"
                  >
                    tinypng.com/developers
                  </a>
                </p>
              </div>
              <Badge tone={tinifyOk ? 'success' : 'warning'}>{tinifyOk ? 'فعال' : 'کلید لازم'}</Badge>
            </div>

            <label className="field-label" htmlFor="tinify-key">
              کلید API
            </label>
            <input
              id="tinify-key"
              type="password"
              className="field-input"
              dir="ltr"
              autoComplete="new-password"
              placeholder={view?.has_tinify_key ? 'برای تغییر، کلید جدید وارد کنید' : 'API key از TinyPNG'}
              value={form.tinifyKeyInput}
              onChange={(e) => patch({ tinifyKeyInput: e.target.value })}
            />
            {view?.has_tinify_key && !form.tinifyKeyInput && view.tinify_key_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.tinify_key_preview}
              </p>
            )}
            {view?.env_fallback.tinify_key && !view.has_tinify_key && !form.tinifyKeyInput.trim() && (
              <p className="mt-1 text-caption text-text-muted">fallback از env: TINIFY_API_KEY</p>
            )}

            <div className="mt-auto pt-4">
              <button
                type="button"
                disabled={testing !== null}
                onClick={() => onTest('tinify')}
                className="btn btn-secondary px-4 py-2 text-small"
              >
                {testing === 'tinify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                تست TinyPNG
              </button>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-lg border border-border bg-surface-soft/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-body font-semibold text-primary-dark">reSmush.it</h3>
                <p className="mt-0.5 text-caption text-text-muted">
                  رایگان و بدون کلید API — برای WebP ابتدا به PNG تبدیل و سپس فشرده می‌شود.
                </p>
              </div>
              <Badge tone={resmushOk ? 'success' : 'warning'}>{resmushOk ? 'فعال' : 'غیرفعال'}</Badge>
            </div>

            <label className="flex items-center gap-2 text-small text-text">
              <input
                type="checkbox"
                checked={form.resmushEnabled}
                onChange={(e) => patch({ resmushEnabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              استفاده از reSmush.it
            </label>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="field-label mb-0">کیفیت فشرده‌سازی</label>
                  {savedQuality !== null && (
                    <span className="text-caption text-text-muted" dir="ltr">
                      ذخیره‌شده: {savedQuality}
                      {qualityDirty ? ' · تغییر ذخیره‌نشده' : null}
                    </span>
                  )}
                </div>
                <div
                  className="grid grid-cols-4 gap-2 sm:grid-cols-8"
                  role="radiogroup"
                  aria-label="کیفیت فشرده‌سازی"
                >
                  {RESMUSH_QUALITY_OPTIONS.map((q) => {
                    const active = qualityValue === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => patch({ resmushQuality: q })}
                        className={`rounded-lg border px-2 py-2 text-caption transition-colors ${
                          active
                            ? 'border-accent bg-accent-soft text-primary-dark'
                            : 'border-border bg-surface text-text hover:border-accent/40'
                        }`}
                        dir="ltr"
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-caption text-text-muted">
                  {qualityValue >= 90
                    ? 'کیفیت بالا — حجم بیشتر'
                    : qualityValue >= 80
                      ? 'متعادل (پیشنهادی)'
                      : 'فشرده‌تر — حجم کمتر'}
                  . برای کیفیت بالا <strong dir="ltr">95</strong> را انتخاب کنید.
                </p>
              </div>
              <div>
                <label className="field-label" htmlFor="resmush-referer">
                  Referer (آدرس سایت)
                </label>
                <input
                  id="resmush-referer"
                  className="field-input"
                  dir="ltr"
                  placeholder="https://bahram.academy"
                  value={form.resmushReferer}
                  onChange={(e) => patch({ resmushReferer: e.target.value })}
                />
                {view?.env_fallback.resmush_referer && !form.resmushReferer.trim() && (
                  <p className="mt-1 text-caption text-text-muted">پیش‌فرض: FRONTEND_URL</p>
                )}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button
                type="button"
                disabled={testing !== null}
                onClick={() => onTest('resmush')}
                className="btn btn-secondary px-4 py-2 text-small"
              >
                {testing === 'resmush' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                تست reSmush.it
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 flex flex-wrap items-center gap-3 text-caption text-text-muted">
          <span>
            پس از تغییر کیفیت یا کلیدها، دکمه <strong>ذخیره</strong> بالای صفحه را بزنید. اگر در مدال بهینه‌سازی «بدون
            بهبود» می‌بینید، یعنی فایل از قبل بهینه است یا موتورها در دسترس نبودند.
          </span>
          {onSave ? (
            <button
              type="button"
              disabled={saving || testing !== null}
              onClick={onSave}
              className="btn btn-secondary px-4 py-1.5 text-caption"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              ذخیره این بخش
            </button>
          ) : null}
        </p>
      </div>
    </div>
  );
}
