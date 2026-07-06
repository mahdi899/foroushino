'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { SEO_META_TARGETS, SEO_PREVIEW_DOMAIN, type SeoMetaTarget } from '@/lib/seo/metaTargets';
import { SeoScorePanel } from '../blog/SeoScorePanel';
import { Badge } from '../ui';
import { getSeo, saveSeo, type SeoData } from './actions';

const TARGETS = SEO_META_TARGETS;

const EMPTY: SeoData = {
  title: '',
  description: '',
  canonical: '',
  robots: 'index,follow',
  focus_keyword: '',
};

export function SeoMetaEditor() {
  const [target, setTarget] = useState<SeoMetaTarget>(TARGETS[0]);
  const [data, setData] = useState<SeoData>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getSeo(target.type, target.id)
      .then((d) => {
        setData({
          ...EMPTY,
          ...(d ?? {}),
          title: d?.title ?? target.label,
          focus_keyword: d?.focus_keyword ?? '',
        });
        setStatus('idle');
      })
      .catch(() => setStatus('idle'));
  }, [target]);

  async function onSave() {
    setStatus('saving');
    const res = await saveSeo(target.type, target.id, data);
    setStatus(res.ok ? 'saved' : 'error');
    if (res.ok) setTimeout(() => setStatus('idle'), 1800);
  }

  const seoScorePanelProps = useMemo(
    () => ({
      mode: 'page' as const,
      title: target.label,
      pageLabel: target.label,
      pagePath: target.path,
      focusKeyword: data.focus_keyword ?? '',
      metaTitle: data.title ?? target.label,
      metaDescription: data.description ?? '',
      canonical: data.canonical ?? '',
      robots: data.robots ?? 'index,follow',
    }),
    [target, data],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <div className="card flex h-fit max-h-[min(52vh,420px)] flex-col overflow-hidden p-3 xl:sticky xl:top-20">
        <p className="mb-2 shrink-0 px-1 text-caption font-semibold text-text-muted">برگه‌های سایت</p>
        <ul className="admin-sidebar-nav min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
          {TARGETS.map((t) => (
            <li key={`${t.type}:${t.id}`}>
              <button
                type="button"
                onClick={() => setTarget(t)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-small ${
                  target.id === t.id && target.type === t.type
                    ? 'bg-primary text-white'
                    : 'text-text hover:bg-surface-soft'
                }`}
              >
                <span className="truncate">{t.label}</span>
                <span className="shrink-0 text-[11px] opacity-70" dir="ltr">
                  {t.path}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card p-4 sm:p-6">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-small text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge tone="accent">{target.type}</Badge>
                  <span className="truncate text-small text-text-muted" dir="ltr">
                    {target.path}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void onSave()}
                  disabled={status === 'saving'}
                  className="btn btn-primary shrink-0 px-4 py-2 text-small"
                >
                  {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {status === 'saved' ? 'ذخیره شد' : 'ذخیره'}
                </button>
              </div>

              <div>
                <p className="mb-3 text-small font-semibold text-primary-dark">تنظیمات SEO</p>
                <div className="mb-4">
                  <label className="field-label">کلمه کلیدی اصلی (Focus Keyword)</label>
                  <input
                    className="field-input"
                    value={data.focus_keyword ?? ''}
                    onChange={(e) => setData({ ...data, focus_keyword: e.target.value })}
                    placeholder="مثلاً: آمادگی سات"
                  />
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="field-label">Meta Title</label>
                    <input
                      value={data.title ?? ''}
                      onChange={(e) => setData({ ...data, title: e.target.value })}
                      className="field-input"
                    />
                  </div>
                  <div>
                    <label className="field-label">Meta Description</label>
                    <textarea
                      value={data.description ?? ''}
                      onChange={(e) => setData({ ...data, description: e.target.value })}
                      rows={4}
                      className="field-input min-h-[5rem]"
                    />
                  </div>
                  <div>
                    <label className="field-label">Canonical URL</label>
                    <input
                      value={data.canonical ?? ''}
                      onChange={(e) => setData({ ...data, canonical: e.target.value })}
                      className="field-input"
                      dir="ltr"
                      placeholder={`https://${SEO_PREVIEW_DOMAIN}${target.path}`}
                    />
                  </div>
                  <div>
                    <label className="field-label">Robots</label>
                    <select
                      value={data.robots}
                      onChange={(e) => setData({ ...data, robots: e.target.value })}
                      className="field-input"
                    >
                      <option value="index,follow">index, follow</option>
                      <option value="noindex,follow">noindex, follow</option>
                      <option value="noindex,nofollow">noindex, nofollow</option>
                    </select>
                  </div>
                </div>
              </div>

              {status === 'error' && (
                <p className="text-small text-error">ذخیره ناموفق بود. دسترسی seo.write را بررسی کنید.</p>
              )}
            </div>
          )}
        </div>

        <SeoScorePanel {...seoScorePanelProps} variant="sidebar" />
      </div>
    </div>
  );
}
