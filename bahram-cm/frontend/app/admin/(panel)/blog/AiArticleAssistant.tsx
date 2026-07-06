'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { AiArticlePromptModal } from './AiArticlePromptModal';
import {
  generateArticleWithAi,
  getAiArticleStatus,
  previewArticleAiPrompt,
} from './actions';
import type { AiArticleResult, ArticleLinkOption } from '@/lib/admin/blogAiTypes';
import type { ApiCategory } from '@/lib/api/types';

interface AiArticleAssistantProps {
  onApply: (result: AiArticleResult) => void;
}

export function AiArticleAssistant({ onApply }: AiArticleAssistantProps) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [keyword, setKeyword] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [linkOptions, setLinkOptions] = useState<ArticleLinkOption[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [selectedLinkPaths, setSelectedLinkPaths] = useState<string[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [aiStatus, setAiStatus] = useState<{ enabled: boolean; configured: boolean; provider: string; sitePages: number } | null>(null);

  useEffect(() => {
    getAiArticleStatus().then((s) =>
      setAiStatus({ enabled: s.enabled, configured: s.configured, provider: s.provider, sitePages: s.sitePages }),
    );
  }, []);

  async function openPromptPreview() {
    if (!topic.trim()) return;
    setPreviewLoading(true);
    setError('');
    setPromptOpen(true);
    const res = await previewArticleAiPrompt({
      topic,
      description,
      keyword,
      selectedLinkPaths: selectedLinkPaths.length ? selectedLinkPaths : undefined,
      categoryName: categoryName || undefined,
    });
    setPreviewLoading(false);
    if (!res.ok) {
      setError(res.error);
      setPromptOpen(false);
      return;
    }
    setSystemPrompt(res.data.systemPrompt);
    setUserPrompt(res.data.userPrompt);
    setLinkOptions(res.data.linkOptions);
    setCategories(res.data.categories);
    setSelectedLinkPaths(res.data.selectedLinkPaths);
    setCategoryName(res.data.categoryName);
  }

  async function runGeneration() {
    setGenerating(true);
    setError('');
    const res = await generateArticleWithAi({
      topic,
      description,
      keyword,
      includeImages,
      systemPrompt,
      userPrompt,
      selectedLinkPaths,
      categoryName,
    });
    setGenerating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPromptOpen(false);
    onApply(res.data);
  }

  const statusHint =
    aiStatus?.configured && aiStatus.enabled
      ? `AI فعال (${aiStatus.provider}) — ${aiStatus.sitePages} صفحه سایت در پرامپت.`
      : 'کلید API تنظیم نشده — نسخه نمونه ساخته می‌شود.';

  return (
    <>
      <div className="rounded-xl border border-accent/25 bg-gradient-to-l from-accent-soft/40 to-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-small font-semibold text-primary-dark">دستیار هوشمند مقاله</p>
            <p className="text-caption text-text-muted">
              قبل از تولید، پرامپت، لینک‌های داخلی و دسته‌بندی را در پاپ‌آپ می‌بینید و تأیید می‌کنید.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">عنوان / موضوع مقاله</label>
            <input
              className="field-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثلاً: راهنمای آمادگی سات در ۱۴۰۴"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">توضیحات و زاویه محتوا</label>
            <textarea
              className="field-input min-h-[5rem]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="برای چه مخاطبی است؟ چه سؤالاتی باید پاسخ داده شود؟"
            />
          </div>
          <div>
            <label className="field-label">کلمه کلیدی (اختیاری)</label>
            <input
              className="field-input"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="مثلاً: آمادگی سات"
            />
          </div>
          <label className="flex items-center gap-2 text-small text-text sm:col-span-2">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            تولید تصویر شاخص و یک تصویر داخل محتوا با AI
          </label>
        </div>

        {error && <p className="mt-2 text-caption text-error">{error}</p>}

        <button
          type="button"
          onClick={openPromptPreview}
          disabled={previewLoading || generating || !topic.trim()}
          className="btn btn-primary mt-3 px-4 py-2 text-small"
        >
          {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          بررسی پرامپت و تولید مقاله
        </button>
        <p className="mt-2 text-caption text-text-muted">
          {statusHint}{' '}
          <Link href="/admin/ai/settings#ai" className="text-accent hover:text-primary">
            تنظیمات AI
          </Link>
        </p>
      </div>

      <AiArticlePromptModal
        open={promptOpen}
        loading={previewLoading}
        generating={generating}
        topic={topic}
        keyword={keyword || topic}
        systemPrompt={systemPrompt}
        userPrompt={userPrompt}
        linkOptions={linkOptions}
        categories={categories}
        selectedLinkPaths={selectedLinkPaths}
        categoryName={categoryName}
        onClose={() => {
          if (generating) return;
          setPromptOpen(false);
        }}
        onSystemPromptChange={setSystemPrompt}
        onUserPromptChange={setUserPrompt}
        onSelectedLinkPathsChange={setSelectedLinkPaths}
        onCategoryNameChange={setCategoryName}
        onConfirm={runGeneration}
      />
    </>
  );
}

