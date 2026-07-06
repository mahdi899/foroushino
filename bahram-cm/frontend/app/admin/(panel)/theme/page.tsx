'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { AdminPage } from '../ui';
import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';

// Live theme token editor. Edits CSS variables in real time and persists to
// site_settings('theme'). In production a small server component injects these
// overrides into a <style> tag so the public site re-themes without a deploy.
const TOKENS: { key: string; label: string; def: string }[] = [
  { key: '--color-bg', label: 'پس‌زمینه (عاج)', def: '#fffdf9' },
  { key: '--color-surface', label: 'سطح/کارت', def: '#ffffff' },
  { key: '--color-surface-soft', label: 'سطح نرم (عاج)', def: '#fffdf9' },
  { key: '--color-primary', label: 'رنگ اصلی (سبز طاووسی)', def: '#064c45' },
  { key: '--color-primary-dark', label: 'اصلی تیره', def: '#032e2a' },
  { key: '--color-primary-soft', label: 'اصلی روشن (مه سبز)', def: '#dcefeb' },
  { key: '--color-secondary', label: 'ثانویه (شامپاین)', def: '#d8c39a' },
  { key: '--color-accent', label: 'اکسنت (آکوا)', def: '#2f9a8c' },
  { key: '--color-accent-soft', label: 'اکسنت نرم', def: '#dbf1ee' },
  { key: '--color-luxury', label: 'لوکس (شامپاین کم‌رنگ)', def: '#c9b488' },
  { key: '--color-border', label: 'خط مرزی', def: '#dde6e2' },
  { key: '--color-text', label: 'متن', def: '#102b28' },
  { key: '--color-text-muted', label: 'متن کم‌رنگ', def: '#6f7e7a' },
  { key: '--color-success', label: 'موفقیت', def: '#2f9e78' },
  { key: '--color-warning', label: 'هشدار', def: '#c0892f' },
  { key: '--color-error', label: 'خطا', def: '#c0493f' },
];

export default function ThemePage() {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(TOKENS.map((t) => [t.key, t.def])),
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'saved'>('idle');

  // Load persisted theme (if any)
  useEffect(() => {
    getSettingBlob<Record<string, string>>('theme', 'tokens')
      .then((value) => {
        if (value) setValues((v) => ({ ...v, ...value }));
      })
      .catch(() => {});
  }, []);

  // Live preview
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(values).forEach(([k, v]) => root.style.setProperty(k, v));
    return () => {
      TOKENS.forEach((t) => root.style.removeProperty(t.key));
    };
  }, [values]);

  function set(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function reset() {
    setValues(Object.fromEntries(TOKENS.map((t) => [t.key, t.def])));
  }

  async function save() {
    setStatus('loading');
    await saveSettingBlob('theme', 'tokens', values).catch(() => {});
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 1800);
  }

  return (
    <AdminPage
      title="تم و توکن‌های طراحی"
      desc="رنگ‌ها را تغییر دهید؛ پیش‌نمایش زنده است."
      action={
        <div className="flex gap-2">
          <button onClick={reset} className="btn btn-secondary px-4 py-2 text-small">
            <RotateCcw className="h-4 w-4" /> بازنشانی
          </button>
          <button onClick={save} className="btn btn-primary px-4 py-2 text-small">
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {status === 'saved' ? 'ذخیره شد' : 'ذخیره'}
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="card p-6">
          <h2 className="mb-4 text-h3 text-primary-dark">توکن‌های رنگ</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOKENS.map((t) => (
              <label key={t.key} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
                <span className="text-small text-text">{t.label}</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={values[t.key]}
                    onChange={(e) => set(t.key, e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <input
                    value={values[t.key]}
                    onChange={(e) => set(t.key, e.target.value)}
                    className="w-20 rounded border border-border px-1.5 py-1 text-caption" dir="ltr"
                  />
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="card p-6">
          <h2 className="mb-4 text-h3 text-primary-dark">پیش‌نمایش</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-gradient-ai p-5 text-white">
              <p className="text-small opacity-90">هیرو نمونه</p>
              <p className="text-h3 font-extrabold">لبخندی که شایستهٔ شماست</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary px-4 py-2 text-small">دکمه اصلی</button>
              <button className="btn btn-secondary px-4 py-2 text-small">دکمه ثانویه</button>
              <span className="chip chip-active">برچسب فعال</span>
              <span className="chip">برچسب</span>
            </div>
            <div className="card p-4">
              <p className="font-bold text-primary-dark">کارت نمونه</p>
              <p className="text-small text-text-muted">متن توضیحی کوتاه برای آزمایش رنگ متن کم‌رنگ.</p>
              <span className="mt-2 inline-block rounded-pill bg-accent-soft px-3 py-1 text-caption text-primary">اکسنت</span>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
