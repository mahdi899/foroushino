'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { generateImageForArticle, getAiImageSettingsPreview } from '../blog/actions';
const DENTAL_IMAGE_PREFIX =
  'Professional dental clinic photography, clean modern medical aesthetic, soft natural lighting, premium luxury feel, no text overlay, no watermark, realistic, high quality.';

interface AiImagePromptModalProps {
  open: boolean;
  defaultPrompt: string;
  purpose: 'cover' | 'inline';
  onClose: () => void;
  onInsert: (url: string, alt: string) => void;
  title?: string;
}

export function AiImagePromptModal({
  open,
  defaultPrompt,
  purpose,
  onClose,
  onInsert,
  title = 'تولید تصویر با AI',
}: AiImagePromptModalProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageModel, setImageModel] = useState<{ engineLabel: string; model: string } | null>(null);

  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt);
      setError('');
      setPreviewUrl('');
      getAiImageSettingsPreview().then((s) => setImageModel({ engineLabel: s.engineLabel, model: s.model }));
    }
  }, [open, defaultPrompt]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !generating) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, generating, onClose]);

  const livePrompt = useMemo(() => {
    const framing =
      purpose === 'cover'
        ? 'Wide 16:9 hero composition suitable for blog cover.'
        : 'Editorial in-article photo, informative and trustworthy.';
    return `${DENTAL_IMAGE_PREFIX} ${framing} Subject: ${prompt.trim() || '…'}`;
  }, [prompt, purpose]);

  async function generate() {
    const p = prompt.trim();
    if (!p) {
      setError('توضیح تصویر را وارد کنید.');
      return;
    }
    setGenerating(true);
    setError('');
    setPreviewUrl('');
    const res = await generateImageForArticle({ prompt: p, purpose });
    setGenerating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPreviewUrl(resolveMediaUrl(res.url));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={generating ? undefined : onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="font-semibold text-primary-dark">{title}</p>
            <p className="mt-0.5 text-caption text-text-muted">پرامپت را ببینید، ویرایش کنید، سپس تصویر را تولید و تأیید کنید.</p>
            {imageModel && (
              <p className="mt-1 text-caption text-text-muted">
                مدل: <span dir="ltr" className="font-mono text-text">{imageModel.model}</span> ({imageModel.engineLabel}) —{' '}
                <Link href="/admin/ai/settings#ai-image" className="text-accent hover:text-primary">
                  تغییر در تنظیمات AI
                </Link>
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} disabled={generating} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="field-label">موضوع تصویر</label>
              <textarea
                className="field-input mt-1 min-h-[5rem]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={generating}
                placeholder="مثلاً: ایمپلنت دندان در کلینیک مدرن"
              />
            </div>
            <div>
              <p className="field-label">پیش‌نمایش زنده پرامپت ارسالی</p>
              <pre
                dir="ltr"
                className="mt-1 max-h-40 overflow-auto rounded-lg border border-border bg-surface-soft p-3 font-mono admin-text-meta leading-relaxed text-text-muted"
              >
                {livePrompt}
              </pre>
            </div>
            {error && <p className="text-caption text-error">{error}</p>}
            <button
              type="button"
              onClick={generate}
              disabled={generating || !prompt.trim()}
              className="btn btn-primary w-full justify-center py-2 text-small"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              تولید تصویر
            </button>
          </div>

          <div className="flex flex-col">
            <p className="field-label mb-2">پیش‌نمایش تصویر</p>
            <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-soft">
              {generating ? (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-caption">در حال تولید…</span>
                </div>
              ) : previewUrl ? (
                <DirectMediaImg admin src={previewUrl} alt={prompt} className="max-h-72 w-full object-contain" />
              ) : (
                <p className="px-4 text-center text-caption text-text-muted">پس از تولید، تصویر اینجا نمایش داده می‌شود.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={generating} className="btn btn-secondary px-4 py-1.5 text-caption">
            انصراف
          </button>
          <button
            type="button"
            disabled={!previewUrl || generating}
            onClick={() => {
              if (!previewUrl) return;
              onInsert(previewUrl, prompt.trim());
              onClose();
            }}
            className="btn btn-primary px-4 py-1.5 text-caption"
          >
            <Check className="h-4 w-4" />
            درج در مقاله
          </button>
        </div>
      </div>
    </div>
  );
}
