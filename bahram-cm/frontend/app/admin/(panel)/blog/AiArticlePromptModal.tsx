'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Loader2, Sparkles, Square, X } from 'lucide-react';
import type { ApiCategory } from '@/lib/api/types';
import {
  CATEGORY_SECTION_END,
  CATEGORY_SECTION_START,
  formatCategorySection,
  formatLinkSection,
  LINK_SECTION_END,
  LINK_SECTION_START,
  upsertPromptSection,
} from '@/lib/ai/articlePromptSections';
import type { ArticleLinkOption } from '@/lib/admin/blogAiTypes';

const KIND_LABELS: Record<string, string> = {
  product: 'محصول',
  service: 'خدمات',
  conversion: 'تبدیل',
  trust: 'اعتماد',
  content: 'محتوا',
  marketing: 'مارکتینگ',
  landing: 'لندینگ',
  nav: 'منو',
  indexed: 'صفحات',
  support: 'پشتیبانی',
  page: 'صفحه',
};

interface AiArticlePromptModalProps {
  open: boolean;
  loading: boolean;
  generating: boolean;
  topic: string;
  keyword: string;
  systemPrompt: string;
  userPrompt: string;
  linkOptions: ArticleLinkOption[];
  categories: ApiCategory[];
  selectedLinkPaths: string[];
  categoryName: string;
  onClose: () => void;
  onSystemPromptChange: (value: string) => void;
  onUserPromptChange: (value: string) => void;
  onSelectedLinkPathsChange: (paths: string[]) => void;
  onCategoryNameChange: (name: string) => void;
  onConfirm: () => void;
}

function PromptLivePreview({
  topic,
  keyword,
  userPrompt,
  systemPrompt,
  selectedLinks,
  categoryName,
}: {
  topic: string;
  keyword: string;
  userPrompt: string;
  systemPrompt: string;
  selectedLinks: ArticleLinkOption[];
  categoryName: string;
}) {
  const relatedCount = (userPrompt.match(/^- \/insights\//gm) ?? []).length;

  const seoChecks = useMemo(
    () => [
      { label: 'کلمه کلیدی در عنوان و H2', ok: systemPrompt.includes('focusKeyword') },
      { label: 'Meta Title و Description', ok: systemPrompt.includes('seo.title') },
      { label: 'Alt فارسی برای تصاویر', ok: systemPrompt.includes('alt') },
      { label: 'ساختار h2/h3', ok: systemPrompt.includes('h2') && systemPrompt.includes('h3') },
      { label: 'GEO — پاسخ مستقیم و سوال‌وجواب', ok: systemPrompt.includes('GEO') },
      { label: 'بلوک مقالات مرتبط در پایان', ok: systemPrompt.includes('مقالات مرتبط') },
      { label: 'دسته‌بندی در JSON', ok: systemPrompt.includes('"category"') || userPrompt.includes('ARTICLE CATEGORY') },
      { label: 'لینک داخلی', ok: selectedLinks.length >= 4 },
      { label: 'مقالات وبلاگ برای لینک', ok: relatedCount >= 3 },
    ],
    [systemPrompt, userPrompt, selectedLinks.length, relatedCount],
  );

  const descriptionLine =
    userPrompt
      .split('\n')
      .find((l) => l.startsWith('زاویه محتوا'))
      ?.replace('زاویه محتوا و مخاطب:', '')
      .trim() ||
    userPrompt
      .split('\n')
      .find((l) => l.startsWith('Content angle'))
      ?.replace('Content angle & audience:', '')
      .trim() ||
    '—';

  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface-soft/60 p-4">
      <div>
        <p className="text-caption font-semibold text-primary-dark">خلاصه درخواست (زنده)</p>
        <dl className="mt-2 space-y-1.5 text-caption">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">موضوع</dt>
            <dd className="font-medium text-text">{topic || '—'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">کلمه کلیدی</dt>
            <dd className="font-medium text-text">{keyword || topic || '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted">زاویه محتوا</dt>
            <dd className="mt-0.5 text-text">{descriptionLine}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">دسته‌بندی</dt>
            <dd className="font-medium text-text">{categoryName || '—'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="text-caption font-semibold text-primary-dark">صفحات مجاز برای لینک ({selectedLinks.length})</p>
        <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-caption">
          {selectedLinks.map((l) => (
            <li key={l.path} className="flex items-start gap-2 rounded-md bg-surface px-2 py-1">
              <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary" dir="ltr">
                {l.path}
              </span>
              <span className="text-text">{l.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-caption font-semibold text-primary-dark">چک‌لیست SEO + GEO</p>
        <ul className="mt-2 space-y-1.5">
          {seoChecks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-caption">
              <span className={c.ok ? 'text-success' : 'text-warning'}>{c.ok ? '✓' : '○'}</span>
              <span className="text-text-muted">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AiArticlePromptModal({
  open,
  loading,
  generating,
  topic,
  keyword,
  systemPrompt,
  userPrompt,
  linkOptions,
  categories,
  selectedLinkPaths,
  categoryName,
  onClose,
  onSystemPromptChange,
  onUserPromptChange,
  onSelectedLinkPathsChange,
  onCategoryNameChange,
  onConfirm,
}: AiArticlePromptModalProps) {
  const [tab, setTab] = useState<'brief' | 'system' | 'links'>('brief');

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !generating) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, generating, onClose]);

  const selectedLinks = useMemo(
    () => linkOptions.filter((l) => selectedLinkPaths.includes(l.path)),
    [linkOptions, selectedLinkPaths],
  );

  const linksByKind = useMemo(() => {
    const groups = new Map<string, ArticleLinkOption[]>();
    for (const link of linkOptions) {
      const kind = link.kind || 'page';
      if (!groups.has(kind)) groups.set(kind, []);
      groups.get(kind)!.push(link);
    }
    return [...groups.entries()];
  }, [linkOptions]);

  function toggleLink(path: string) {
    const next = selectedLinkPaths.includes(path)
      ? selectedLinkPaths.filter((p) => p !== path)
      : [...selectedLinkPaths, path];
    onSelectedLinkPathsChange(next);
    const links = linkOptions.filter((l) => next.includes(l.path));
    onUserPromptChange(
      upsertPromptSection(userPrompt, formatLinkSection(links), LINK_SECTION_START, LINK_SECTION_END),
    );
  }

  function toggleAllLinks(selectAll: boolean) {
    const next = selectAll ? linkOptions.map((l) => l.path) : [];
    onSelectedLinkPathsChange(next);
    onUserPromptChange(
      upsertPromptSection(
        userPrompt,
        selectAll ? formatLinkSection(linkOptions) : '',
        LINK_SECTION_START,
        LINK_SECTION_END,
      ),
    );
  }

  function changeCategory(name: string) {
    onCategoryNameChange(name);
    onUserPromptChange(
      upsertPromptSection(userPrompt, formatCategorySection(name), CATEGORY_SECTION_START, CATEGORY_SECTION_END),
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-2 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={generating ? undefined : onClose} />
      <div className="relative z-10 flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-semibold text-primary-dark">بررسی و تأیید پرامپت مقاله</p>
            <p className="mt-0.5 text-caption text-text-muted">
              پرامپت SEO + GEO، لینک‌های داخلی، مقالات مرتبط و دسته‌بندی را ببینید؛ در صورت نیاز ویرایش کنید.
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={generating} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2">
          <select
            className="field-input max-w-[200px] py-1.5 text-caption"
            value={categoryName}
            onChange={(e) => changeCategory(e.target.value)}
            disabled={loading || generating}
          >
            {categories.length === 0 && <option value="">بدون دسته</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="text-caption text-text-muted">
            {selectedLinkPaths.length} / {linkOptions.length} صفحه برای لینک
          </span>
        </div>

        <div className="flex gap-1 border-b border-border px-5">
          {(['brief', 'links', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-3 py-2 text-caption font-medium ${
                tab === t ? 'bg-surface-soft text-primary-dark' : 'text-text-muted hover:text-text'
              }`}
            >
              {t === 'brief' ? 'درخواست مقاله' : t === 'links' ? 'صفحات لینک' : 'دستورالعمل سیستم'}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b border-border p-4 lg:border-b-0 lg:border-e">
            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center gap-2 text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-small">در حال آماده‌سازی…</span>
              </div>
            ) : tab === 'brief' ? (
              <textarea
                className="field-input min-h-[360px] font-mono text-[12px] leading-relaxed"
                dir="auto"
                value={userPrompt}
                onChange={(e) => onUserPromptChange(e.target.value)}
                disabled={generating}
              />
            ) : tab === 'system' ? (
              <textarea
                className="field-input min-h-[360px] font-mono text-[12px] leading-relaxed"
                dir="ltr"
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
                disabled={generating}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggleAllLinks(true)} className="btn btn-secondary px-2 py-1 text-caption">
                    <CheckSquare className="h-3.5 w-3.5" />
                    همه
                  </button>
                  <button type="button" onClick={() => toggleAllLinks(false)} className="btn btn-secondary px-2 py-1 text-caption">
                    <Square className="h-3.5 w-3.5" />
                    هیچ‌کدام
                  </button>
                </div>
                <div className="max-h-[360px] space-y-4 overflow-y-auto">
                  {linksByKind.map(([kind, links]) => (
                    <div key={kind}>
                      <p className="mb-2 text-caption font-semibold text-primary-dark">
                        {KIND_LABELS[kind] ?? kind}
                      </p>
                      <ul className="space-y-1">
                        {links.map((l) => {
                          const checked = selectedLinkPaths.includes(l.path);
                          return (
                            <li key={l.path}>
                              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 hover:bg-surface-soft">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleLink(l.path)}
                                  disabled={generating}
                                  className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-caption font-medium text-text">{l.label}</span>
                                  <span className="font-mono text-[11px] text-text-muted" dir="ltr">
                                    {l.path}
                                  </span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            {!loading && (
              <PromptLivePreview
                topic={topic}
                keyword={keyword}
                userPrompt={userPrompt}
                systemPrompt={systemPrompt}
                selectedLinks={selectedLinks}
                categoryName={categoryName}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={generating} className="btn btn-secondary px-4 py-1.5 text-caption">
            انصراف
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || generating || !systemPrompt.trim() || !userPrompt.trim() || selectedLinkPaths.length === 0}
            className="btn btn-primary px-4 py-1.5 text-caption"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            تأیید و اجرای AI
          </button>
        </div>
      </div>
    </div>
  );
}
