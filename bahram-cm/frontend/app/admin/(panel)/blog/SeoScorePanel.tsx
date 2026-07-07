'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Clock,
  FileText,
  Globe,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import {
  scoreArticleSeo,
  scorePageSeo,
  seoScoreBg,
  seoScoreColor,
  seoGradeLabel,
  SEO_CHECK_GROUPS,
  charBarStatus,
  charBarColor,
  type SeoCheck,
} from '@/lib/admin/seoScore';
import type { SeoFixArticleContext, SeoFixPatch } from '@/lib/ai/seoFix';
import type { ApiCategory } from '@/lib/api/types';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';
import { SeoFixModal } from './SeoFixModal';

interface SeoScorePanelProps {
  title: string;
  excerpt?: string;
  body?: string;
  slug?: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  coverUrl?: string;
  categoryName?: string;
  robots?: string;
  canonical?: string;
  indexNotifyMessage?: string | null;
  categories?: ApiCategory[];
  onApplyFix?: (patch: SeoFixPatch) => void;
  /** sidebar: sticky in right column; inline: full-width below editor (focus mode) */
  variant?: 'sidebar' | 'inline';
  /** Public path segment before slug, e.g. `/insights` or `/transformations` */
  publicBasePath?: string;
  /** Static site page meta editor */
  mode?: 'article' | 'page';
  pagePath?: string;
  pageLabel?: string;
}

function StatusIcon({ status }: { status: 'good' | 'ok' | 'bad' }) {
  if (status === 'good') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />;
  if (status === 'ok') return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" />;
  return <XCircle className="h-3.5 w-3.5 shrink-0 text-error" />;
}

function CharMeter({ label, length, min, max }: { label: string; length: number; min: number; max: number }) {
  const status = charBarStatus(length, min, max);
  const pct = Math.min(100, Math.round((length / (max + 20)) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-text-muted">{label}</span>
        <span className={status === 'good' ? 'text-success' : status === 'ok' ? 'text-warning' : 'text-error'}>
          {length} / {min}–{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
        <div className={`h-full rounded-full transition-all ${charBarColor(status)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SeoScorePanel(props: SeoScorePanelProps) {
  const mode = props.mode ?? 'article';
  const { score, checks, stats, grade } =
    mode === 'page'
      ? scorePageSeo({
          pageLabel: props.pageLabel ?? props.title,
          pagePath: props.pagePath ?? '/',
          focusKeyword: props.focusKeyword,
          metaTitle: props.metaTitle,
          metaDescription: props.metaDescription,
          canonical: props.canonical,
          robots: props.robots,
        })
      : scoreArticleSeo({
          title: props.title,
          excerpt: props.excerpt ?? '',
          body: props.body ?? '',
          slug: props.slug ?? '',
          focusKeyword: props.focusKeyword,
          metaTitle: props.metaTitle,
          metaDescription: props.metaDescription,
          coverUrl: props.coverUrl,
          categoryName: props.categoryName,
          robots: props.robots,
        });
  const variant = props.variant ?? 'sidebar';
  const [copied, setCopied] = useState(false);
  const [previewTab, setPreviewTab] = useState<'google' | 'social'>('google');
  const [fixCheck, setFixCheck] = useState<SeoCheck | null>(null);

  const articleContext: SeoFixArticleContext = useMemo(
    () => ({
      title: props.title,
      excerpt: props.excerpt ?? '',
      body: props.body ?? '',
      slug: props.slug ?? '',
      focusKeyword: props.focusKeyword,
      metaTitle: props.metaTitle,
      metaDescription: props.metaDescription,
      categoryName: props.categoryName ?? '',
    }),
    [props],
  );

  const publicUrl =
    mode === 'page'
      ? props.canonical?.trim() || (props.pagePath ? `${siteConfig.url}${props.pagePath}` : '')
      : props.slug
        ? `${siteConfig.url}${props.publicBasePath ?? '/insights'}/${props.slug}`
        : '';
  const coverPreviewUrl = resolveMediaUrl(props.coverUrl);
  const domain = useMemo(() => {
    try {
      return new URL(siteConfig.url).hostname;
    } catch {
      return 'Bahram.com';
    }
  }, []);

  const checksByGroup = useMemo(() => {
    const map = new Map<string, typeof checks>();
    for (const g of SEO_CHECK_GROUPS) map.set(g.id, []);
    for (const c of checks) {
      map.get(c.group)?.push(c);
    }
    return SEO_CHECK_GROUPS.map((g) => ({ ...g, items: map.get(g.id) ?? [] })).filter((g) => g.items.length > 0);
  }, [checks]);

  const badCount = checks.filter((c) => c.status === 'bad').length;
  const okCount = checks.filter((c) => c.status === 'ok').length;

  async function copyUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onCheckClick(c: SeoCheck) {
    if (c.status === 'good') return;
    if (!props.onApplyFix) return;
    setFixCheck(c);
  }

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border p-4',
        seoScoreBg(score),
        variant === 'sidebar' && 'sticky top-20',
        variant === 'inline' && 'mt-2',
      )}
    >
      {/* Score header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-small font-semibold text-primary-dark">تحلیل سئو</p>
          <p className="text-[11px] text-text-muted">{seoGradeLabel(grade)} · {checks.length} معیار</p>
        </div>
        <div className="text-left">
          <p className={`text-h2 font-extrabold leading-none ${seoScoreColor(score)}`}>{score}</p>
          <p className="text-[10px] text-text-muted">از ۱۰۰</p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
        <div
          className={`h-full rounded-full transition-all ${score >= 75 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-error'}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {badCount > 0 && (
        <p className="rounded-md bg-surface/80 px-2 py-1.5 text-[11px] text-text-muted">
          {badCount} مورد نیاز به اصلاح · {okCount} قابل بهبود
          {mode === 'article' && props.onApplyFix ? ' — روی ✦ کلیک کنید' : ''}
        </p>
      )}

      {props.indexNotifyMessage && (
        <p className="flex items-start gap-1.5 rounded-md border border-success/40 bg-success/10 px-2 py-1.5 text-[11px] text-success">
          <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {props.indexNotifyMessage}
        </p>
      )}

      {/* Writer tools */}
      <div className="rounded-lg border border-border bg-surface/90 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-primary-dark">
          <BarChart3 className="h-3.5 w-3.5" />
          {mode === 'page' ? 'خلاصه متا' : 'ابزار نویسنده'}
        </p>
        {mode === 'article' ? (
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 rounded-md bg-surface-soft px-2 py-1.5">
              <FileText className="h-3 w-3 text-text-muted" />
              <span>{stats.wordCount} کلمه</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-surface-soft px-2 py-1.5">
              <Clock className="h-3 w-3 text-text-muted" />
              <span>{stats.readingMinutes} دقیقه مطالعه</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-surface-soft px-2 py-1.5">
              <Link2 className="h-3 w-3 text-text-muted" />
              <span>{stats.internalLinks} لینک داخلی</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-surface-soft px-2 py-1.5">
              <span className="text-text-muted">H2/H3</span>
              <span>{stats.h2Count}/{stats.h3Count}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-text-muted" dir="ltr">
            {props.pagePath ?? '/'}
          </p>
        )}
        {mode === 'article' && props.focusKeyword.trim() && (
          <p className="mt-2 text-[11px] text-text-muted">
            تراکم «{props.focusKeyword}»:{' '}
            <span className={stats.keywordDensity >= 0.4 && stats.keywordDensity <= 2.5 ? 'text-success' : 'text-warning'}>
              {stats.keywordDensity.toFixed(1)}٪
            </span>
          </p>
        )}
        <div className="mt-3 space-y-2">
          <CharMeter label="عنوان SEO" length={stats.titleLength} min={30} max={60} />
          <CharMeter label="Meta Description" length={stats.descLength} min={120} max={160} />
        </div>
        {publicUrl && (
          <div className="mt-3 flex items-center gap-1">
            <input
              readOnly
              dir="ltr"
              value={publicUrl}
              className="field-input min-w-0 flex-1 py-1 font-mono text-[10px]"
            />
            <button type="button" onClick={copyUrl} className="btn btn-secondary shrink-0 px-2 py-1" title="کپی URL">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary shrink-0 px-2 py-1"
              title="تست Rich Results"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Grouped checks */}
      <div className="max-h-[340px] space-y-3 overflow-y-auto pe-1">
        {checksByGroup.map((group) => (
          <div key={group.id}>
            <p className="mb-1.5 text-[11px] font-semibold text-primary-dark">{group.label}</p>
            <ul className="space-y-1.5">
              {group.items.map((c) => {
                const clickable = mode === 'article' && c.status !== 'good' && Boolean(props.onApplyFix);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onCheckClick(c)}
                      disabled={!clickable}
                      className={`flex w-full items-start gap-2 rounded-lg px-1 py-1 text-right text-[11px] transition ${
                        clickable ? 'cursor-pointer hover:bg-surface/80 hover:ring-1 hover:ring-accent/30' : 'cursor-default'
                      }`}
                      title={clickable ? 'کلیک برای اصلاح با AI' : undefined}
                    >
                      <StatusIcon status={c.status} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text">
                          {c.label}
                          {clickable && <span className="ms-1 text-accent">✦</span>}
                        </p>
                        <p className="text-text-muted">{c.hint}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* SERP / Social preview */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex border-b border-border">
          {(['google', 'social'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPreviewTab(t)}
              className={`flex-1 px-2 py-2 text-[11px] font-medium ${
                previewTab === t ? 'bg-surface-soft text-primary-dark' : 'text-text-muted hover:text-text'
              }`}
            >
              {t === 'google' ? 'پیش‌نمایش گوگل' : 'شبکه اجتماعی'}
            </button>
          ))}
        </div>
        <div className="p-3">
          {previewTab === 'google' ? (
            <>
              <p className="truncate text-[13px] text-[#1a0dab]">{props.metaTitle || props.title || (mode === 'page' ? props.pageLabel : 'عنوان')}</p>
              <p className="text-[12px] text-[#006621]" dir="ltr">
                {mode === 'page'
                  ? `${domain}${props.pagePath ?? '/'}`
                  : `${domain} › ${(props.publicBasePath ?? '/insights').replace(/^\//, '')} › ${props.slug || '…'}`}
              </p>
              <p className="line-clamp-2 text-[12px] text-text-muted">
                {props.metaDescription || props.excerpt || 'توضیحات متا…'}
              </p>
            </>
          ) : (
            <>
              {coverPreviewUrl ? (
                <div className="relative mb-2 aspect-[1.91/1] max-h-28 overflow-hidden rounded-md border border-border bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreviewUrl}
                    alt={props.metaTitle || props.title || 'تصویر شاخص'}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mb-2 flex h-20 items-center justify-center rounded-md border border-dashed border-border bg-surface-soft text-[11px] text-text-muted">
                  تصویر شاخص برای OG
                </div>
              )}
              <p className="text-[10px] uppercase text-text-muted" dir="ltr">
                {domain}
              </p>
              <p className="line-clamp-2 text-[13px] font-semibold text-text">{props.metaTitle || props.title || 'عنوان'}</p>
              <p className="line-clamp-2 text-[11px] text-text-muted">{props.metaDescription || props.excerpt || '…'}</p>
            </>
          )}
        </div>
      </div>

      {mode === 'article' && (
        <SeoFixModal
          open={Boolean(fixCheck)}
          check={fixCheck}
          article={articleContext}
          categories={props.categories ?? []}
          onClose={() => setFixCheck(null)}
          onApply={(patch) => props.onApplyFix?.(patch)}
        />
      )}
    </div>
  );
}
