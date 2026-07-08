'use client';

import { useState } from 'react';
import { ImageIcon, List } from 'lucide-react';
import Link from 'next/link';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import {
  AI_IMAGE_ENGINES,
  AI_IMAGE_MODELS,
  DEFAULT_IMAGE_SETTINGS,
  providerMeta,
  type AiImageEngine,
} from '@/lib/ai/types';
import { GeminiModelsModal } from '../../settings/GeminiModelsModal';
import {
  AiActionBar,
  AiFieldBlock,
  AiSection,
  AiSidebarCard,
  AiSidebarHint,
  AiSidebarHintItem,
  AiStatusBadge,
} from './AiSettingsShared';

export type AiImageSettingsForm = {
  engine: AiImageEngine;
  model: string;
  baseUrl: string;
  googleApiKeyInput: string;
  openaiApiKeyInput: string;
};

export type AiImageSettingsMeta = {
  hasGoogleApiKey: boolean;
  googleApiKeyPreview: string | null;
  googleEnvFallback: boolean;
  hasOpenaiApiKey: boolean;
  openaiApiKeyPreview: string | null;
  openaiEnvFallback: boolean;
};

export const DEFAULT_AI_IMAGE_FORM: AiImageSettingsForm = {
  engine: DEFAULT_IMAGE_SETTINGS.engine,
  model: DEFAULT_IMAGE_SETTINGS.model,
  baseUrl: providerMeta('gemini').defaultBaseUrl,
  googleApiKeyInput: '',
  openaiApiKeyInput: '',
};

export const DEFAULT_AI_IMAGE_META: AiImageSettingsMeta = {
  hasGoogleApiKey: false,
  googleApiKeyPreview: null,
  googleEnvFallback: false,
  hasOpenaiApiKey: false,
  openaiApiKeyPreview: null,
  openaiEnvFallback: false,
};

interface AiImageSettingsSectionProps {
  form: AiImageSettingsForm;
  meta: AiImageSettingsMeta;
  onChange: (form: AiImageSettingsForm) => void;
  onSave: () => void;
  onTestImage: () => void;
  saveStatus: 'idle' | 'loading' | 'saved' | 'error';
  saveMessage?: string;
  imageTestStatus: 'idle' | 'loading' | 'ok' | 'error';
  imageTestMessage: string;
  imageTestPreviewUrl?: string;
}

export function AiImageSettingsSection({
  form,
  meta,
  onChange,
  onSave,
  onTestImage,
  saveStatus,
  saveMessage,
  imageTestStatus,
  imageTestMessage,
  imageTestPreviewUrl,
}: AiImageSettingsSectionProps) {
  const [modelsModalOpen, setModelsModalOpen] = useState(false);
  const imageModelListId = 'ai-image-models';
  const engineInfo = AI_IMAGE_ENGINES.find((e) => e.id === form.engine);
  const usesGoogleKey = form.engine === 'imagen' || form.engine === 'gemini-native';
  const usesOpenaiKey = form.engine === 'openai';
  const keyOk =
    (usesGoogleKey && (meta.hasGoogleApiKey || meta.googleEnvFallback)) ||
    (usesOpenaiKey && (meta.hasOpenaiApiKey || meta.openaiEnvFallback));

  return (
    <AiSection
      id="ai-image"
      icon={ImageIcon}
      iconTone="image"
      title="تولید تصویر"
      subtitle="Imagen، Gemini Image یا DALL·E — برای تصویر شاخص و محتوای مقاله"
      badge={<AiStatusBadge ok={keyOk} label={keyOk ? 'پیکربندی شده' : 'نیاز به کلید'} />}
      sidebar={
        <>
          <AiSidebarCard title="وضعیت">
            <AiSidebarHint>
              <AiSidebarHintItem>
                {imageTestStatus === 'ok' ? 'آخرین تست موفق' : 'هنوز تست نشده'}
              </AiSidebarHintItem>
              <AiSidebarHintItem>موتور: {engineInfo?.label ?? form.engine}</AiSidebarHintItem>
              <AiSidebarHintItem>
                مدل: <span dir="ltr">{form.model}</span>
              </AiSidebarHintItem>
            </AiSidebarHint>
          </AiSidebarCard>
          <AiSidebarCard title="استفاده">
            <p className="text-caption leading-6 text-text-muted">
              <Link href="/admin/blog/new" className="text-accent hover:text-primary">
                ویرایشگر مقاله
              </Link>{' '}
              — دکمه Sparkles در نوار ابزار
            </p>
          </AiSidebarCard>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <AiFieldBlock label="موتور تولید" hint={engineInfo?.hint}>
            <select
              className="field-input"
              value={form.engine}
              onChange={(e) => {
                const engine = e.target.value as AiImageEngine;
                const defaultModel = AI_IMAGE_MODELS[engine][0] ?? DEFAULT_IMAGE_SETTINGS.model;
                onChange({ ...form, engine, model: defaultModel });
              }}
            >
              {AI_IMAGE_ENGINES.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </AiFieldBlock>

          <AiFieldBlock label="مدل تصویر">
            <div className="flex gap-2">
              <input
                dir="ltr"
                list={imageModelListId}
                className="field-input min-w-0 flex-1 font-mono text-small"
                value={form.model}
                onChange={(e) => onChange({ ...form, model: e.target.value })}
                placeholder="imagen-3.0-generate-002"
              />
              {usesGoogleKey && (
                <button
                  type="button"
                  onClick={() => setModelsModalOpen(true)}
                  className="btn btn-secondary shrink-0 px-3 py-2 text-small"
                  title="لیست مدل‌های تصویر"
                >
                  <List className="h-4 w-4" />
                </button>
              )}
            </div>
            <datalist id={imageModelListId}>
              {AI_IMAGE_MODELS[form.engine].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </AiFieldBlock>
        </div>

        {usesGoogleKey && (
          <>
            <AiFieldBlock label="کلید Google AI">
              <input
                id="ai-image-google-key"
                type="password"
                dir="ltr"
                className="field-input font-mono text-small"
                value={form.googleApiKeyInput}
                onChange={(e) => onChange({ ...form, googleApiKeyInput: e.target.value })}
                placeholder="AIza... — جدا از کلید چت"
                autoComplete="new-password"
              />
              {meta.hasGoogleApiKey && !form.googleApiKeyInput && meta.googleApiKeyPreview && (
                <p className="mt-2 text-caption text-success" dir="ltr">
                  ذخیره‌شده: {meta.googleApiKeyPreview}
                </p>
              )}
              {meta.googleEnvFallback && !meta.hasGoogleApiKey && !form.googleApiKeyInput.trim() && (
                <p className="mt-2 text-caption text-text-muted">fallback: GEMINI_API_KEY</p>
              )}
            </AiFieldBlock>
            <AiFieldBlock label="Base URL (Google)">
              <input
                dir="ltr"
                className="field-input font-mono text-small"
                value={form.baseUrl}
                onChange={(e) => onChange({ ...form, baseUrl: e.target.value })}
                placeholder={providerMeta('gemini').defaultBaseUrl}
              />
            </AiFieldBlock>
          </>
        )}

        {usesOpenaiKey && (
          <AiFieldBlock label="کلید OpenAI (DALL·E)">
            <input
              type="password"
              dir="ltr"
              className="field-input font-mono text-small"
              value={form.openaiApiKeyInput}
              onChange={(e) => onChange({ ...form, openaiApiKeyInput: e.target.value })}
              placeholder="sk-..."
              autoComplete="new-password"
            />
            {meta.hasOpenaiApiKey && !form.openaiApiKeyInput && meta.openaiApiKeyPreview && (
              <p className="mt-2 text-caption text-success" dir="ltr">
                ذخیره‌شده: {meta.openaiApiKeyPreview}
              </p>
            )}
          </AiFieldBlock>
        )}

        <AiActionBar
          onTest={onTestImage}
          onSave={onSave}
          testLabel="تست تولید تصویر"
          saveLabel="ذخیره تصویر"
          testIcon={ImageIcon}
          testStatus={imageTestStatus}
          saveStatus={saveStatus}
          saveMessage={saveMessage}
          testMessage={imageTestMessage}
        />

        {imageTestPreviewUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-surface-soft/40">
            <DirectMediaImg admin src={imageTestPreviewUrl} alt="نتیجه تست" className="mx-auto max-h-52 w-full object-contain p-2" />
            <p className="border-t border-border px-3 py-2 text-center text-caption text-text-muted">
              <Link href="/admin/gallery" className="text-accent hover:text-primary">
                مشاهده در گالری
              </Link>
            </p>
          </div>
        )}
      </div>

      {usesGoogleKey && (
        <GeminiModelsModal
          open={modelsModalOpen}
          onClose={() => setModelsModalOpen(false)}
          filter="image"
          geminiApiKeyInput={form.googleApiKeyInput || undefined}
          baseUrl={form.baseUrl || undefined}
          onSelect={(modelId) => onChange({ ...form, model: modelId })}
        />
      )}
    </AiSection>
  );
}
