'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { SEO_META_TARGETS, SEO_PREVIEW_DOMAIN, type SeoMetaTarget } from '@/lib/seo/metaTargets';
import { Badge } from '../ui';
import { getSeo, saveSeo, type SeoData } from './actions';

const TARGETS = SEO_META_TARGETS;

const EMPTY: SeoData = { title: '', description: '', canonical: '', robots: 'index,follow' };

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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={onSave} disabled={status === 'saving'} className="btn btn-primary px-4 py-2 text-small">
          {status === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {status === 'saved' ? 'ذخیره شد' : 'ذخیره متا'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="card h-fit max-h-[min(70vh,560px)] overflow-hidden p-3">
          <ul className="max-h-[min(68vh,520px)] space-y-1 overflow-y-auto">
            {TARGETS.map((t) => (
              <li key={`${t.type}:${t.id}`}>
                <button
                  onClick={() => setTarget(t)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-small ${
                    target.id === t.id && target.type === t.type ? 'bg-primary text-white' : 'text-text hover:bg-surface-soft'
                  }`}
                >
                  {t.label}
                  <span className="text-[11px] opacity-70" dir="ltr">
                    {t.path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          {status === 'loading' ? (
            <div className="flex items-center gap-2 text-small text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Badge tone="accent">{target.type}</Badge>
                <span className="text-small text-text-muted" dir="ltr">
                  {target.path}
                </span>
              </div>
              <div>
                <label className="field-label">Meta Title</label>
                <input value={data.title ?? ''} onChange={(e) => setData({ ...data, title: e.target.value })} className="field-input" />
                <p className="mt-1 text-caption text-text-muted">{(data.title ?? '').length}/۶۰ کاراکتر توصیه‌شده</p>
              </div>
              <div>
                <label className="field-label">Meta Description</label>
                <textarea
                  value={data.description ?? ''}
                  onChange={(e) => setData({ ...data, description: e.target.value })}
                  rows={3}
                  className="field-input"
                />
                <p className="mt-1 text-caption text-text-muted">{(data.description ?? '').length}/۱۶۰ کاراکتر توصیه‌شده</p>
              </div>
              <div>
                <label className="field-label">Canonical URL</label>
                <input
                  value={data.canonical ?? ''}
                  onChange={(e) => setData({ ...data, canonical: e.target.value })}
                  className="field-input"
                  dir="ltr"
                  placeholder={`https://${SEO_PREVIEW_DOMAIN}/...`}
                />
              </div>
              <div>
                <label className="field-label">Robots</label>
                <select value={data.robots} onChange={(e) => setData({ ...data, robots: e.target.value })} className="field-input">
                  <option value="index,follow">index, follow</option>
                  <option value="noindex,follow">noindex, follow</option>
                  <option value="noindex,nofollow">noindex, nofollow</option>
                </select>
              </div>

              <div className="rounded-lg border border-border bg-surface-soft/40 p-4">
                <p className="mb-1 text-caption text-text-muted">پیش‌نمایش گوگل</p>
                <p className="truncate text-[13px] text-[#1a0dab]">{data.title || 'عنوان صفحه'}</p>
                <p className="text-[12px] text-[#006621]" dir="ltr">
                  {SEO_PREVIEW_DOMAIN}
                  {target.path}
                </p>
                <p className="line-clamp-2 text-[12px] text-text-muted">{data.description || 'توضیحات متا اینجا نمایش داده می‌شود.'}</p>
              </div>

              {status === 'error' && <p className="text-small text-error">ذخیره ناموفق بود. دسترسی seo.write را بررسی کنید.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
