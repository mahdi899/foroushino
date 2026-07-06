'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bot, List } from 'lucide-react';
import { AI_PROVIDERS, DEFAULT_IMAGE_SETTINGS, providerMeta, type AiImageEngine, type AiProvider } from '@/lib/ai/types';
import { GeminiModelsModal } from './GeminiModelsModal';
import {
  AiActionBar,
  AiFieldBlock,
  AiSection,
  AiSidebarCard,
  AiSidebarHint,
  AiSidebarHintItem,
  AiStatusBadge,
  AiToggleRow,
} from '../ai/settings/AiSettingsShared';

export type ProviderForm = {
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput: string;
};

export type AiSettingsForm = {
  enabled: boolean;
  provider: AiProvider;
  providers: Record<AiProvider, ProviderForm>;
  image: {
    engine: AiImageEngine;
    model: string;
  };
};

export type ProviderMeta = {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  envFallback: boolean;
};

export type AiSettingsMeta = {
  providers: Record<AiProvider, ProviderMeta>;
  keySource: 'panel' | 'env' | 'none';
};

function emptyProviderForm(): Record<AiProvider, ProviderForm> {
  return AI_PROVIDERS.reduce(
    (acc, meta) => {
      acc[meta.id] = { model: meta.defaultModel, baseUrl: meta.defaultBaseUrl, temperature: 0.7, apiKeyInput: '' };
      return acc;
    },
    {} as Record<AiProvider, ProviderForm>,
  );
}

function emptyProviderMeta(): Record<AiProvider, ProviderMeta> {
  return AI_PROVIDERS.reduce(
    (acc, meta) => {
      acc[meta.id] = { hasApiKey: false, apiKeyPreview: null, envFallback: false };
      return acc;
    },
    {} as Record<AiProvider, ProviderMeta>,
  );
}

export const DEFAULT_AI_FORM: AiSettingsForm = {
  enabled: true,
  provider: 'openai',
  providers: emptyProviderForm(),
  image: { ...DEFAULT_IMAGE_SETTINGS },
};

export const DEFAULT_AI_META: AiSettingsMeta = {
  providers: emptyProviderMeta(),
  keySource: 'none',
};

interface AiSettingsSectionProps {
  form: AiSettingsForm;
  meta: AiSettingsMeta;
  onChange: (form: AiSettingsForm) => void;
  onTest: () => void;
  onSave: () => void;
  onShowDetails?: () => void;
  testStatus: 'idle' | 'loading' | 'ok' | 'error';
  testMessage: string;
  saveStatus: 'idle' | 'loading' | 'saved' | 'error';
  saveMessage: string;
  hasUnsavedKey: boolean;
}

export function AiSettingsSection({
  form,
  meta,
  onChange,
  onTest,
  onSave,
  onShowDetails,
  testStatus,
  testMessage,
  saveStatus,
  saveMessage,
  hasUnsavedKey,
}: AiSettingsSectionProps) {
  const [modelsModalOpen, setModelsModalOpen] = useState(false);
  const active = providerMeta(form.provider);
  const activeForm = form.providers[form.provider];
  const activeMeta = meta.providers[form.provider];
  const keyOk = activeMeta?.hasApiKey || activeMeta?.envFallback;

  function setProviderField(patch: Partial<ProviderForm>) {
    onChange({
      ...form,
      providers: {
        ...form.providers,
        [form.provider]: { ...activeForm, ...patch },
      },
    });
  }

  const activeSourceLabel =
    hasUnsavedKey
      ? 'کلید وارد شده — هنوز ذخیره نشده'
      : meta.keySource === 'panel'
        ? 'کلید ذخیره‌شده در پنل'
        : meta.keySource === 'env'
          ? 'کلید env سرور'
          : 'کلیدی تنظیم نشده';

  const modelListId = `ai-models-${form.provider}`;

  return (
    <AiSection
      id="ai"
      icon={Bot}
      title="متن و مقاله"
      subtitle="تولید مقاله، alt تصاویر و متن‌های هوشمند — کلید و مدل مشترک برای این بخش"
      badge={
        <AiStatusBadge
          ok={Boolean(form.enabled && keyOk)}
          label={form.enabled && keyOk ? 'آماده' : form.enabled ? 'نیاز به کلید' : 'غیرفعال'}
        />
      }
      sidebar={
        <>
          <AiSidebarCard title="وضعیت">
            <AiSidebarHint>
              <AiSidebarHintItem>
                {form.enabled ? 'فعال' : 'غیرفعال'} — {active.label}
              </AiSidebarHintItem>
              <AiSidebarHintItem>منبع کلید: {activeSourceLabel}</AiSidebarHintItem>
              {hasUnsavedKey && (
                <li className="text-caption leading-6 text-warning">
                  کلید جدید ذخیره نشده — «ذخیره» یا تست موفق لازم است.
                </li>
              )}
            </AiSidebarHint>
          </AiSidebarCard>

          <AiSidebarCard title="ارائه‌دهنده‌ها">
            <ul className="space-y-1.5 text-caption">
              {AI_PROVIDERS.map((p) => {
                const pm = meta.providers[p.id];
                const ok = pm?.hasApiKey || pm?.envFallback;
                return (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-text">{p.label}</span>
                    <span className={ok ? 'text-success' : 'text-text-muted'}>
                      {pm?.hasApiKey ? 'پنل' : pm?.envFallback ? 'env' : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </AiSidebarCard>

          <AiSidebarCard title="میانبرها">
            <p className="text-caption leading-6 text-text-muted">
              <Link href="/admin/blog/new" className="text-accent hover:text-primary">
                تولید مقاله
              </Link>
              {' · '}
              <Link href="#ai-image" className="text-accent hover:text-primary">
                تنظیم تصویر
              </Link>
            </p>
          </AiSidebarCard>
        </>
      }
    >
      <div className="grid gap-4">
        <AiToggleRow
          checked={form.enabled}
          onChange={(enabled) => onChange({ ...form, enabled })}
          label="فعال‌سازی هوش مصنوعی"
          description="برای تولید مقاله و متن‌های سایت در پنل ادمین"
        />

        <AiFieldBlock label="ارائه‌دهنده فعال" hint={active.hint}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AI_PROVIDERS.map((p) => {
              const selected = form.provider === p.id;
              const configured = meta.providers[p.id]?.hasApiKey || meta.providers[p.id]?.envFallback;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ ...form, provider: p.id })}
                  className={`relative rounded-xl border p-3 text-right transition ${
                    selected
                      ? 'border-primary bg-primary-soft/40 ring-1 ring-primary shadow-soft'
                      : 'border-border bg-surface hover:border-accent/50'
                  }`}
                >
                  <span className="block text-small font-semibold text-text">{p.label}</span>
                  <span className="mt-0.5 block text-caption text-text-muted">{p.brand.split(' · ')[0]}</span>
                  {configured && (
                    <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-success" title="کلید تنظیم شده" />
                  )}
                </button>
              );
            })}
          </div>
        </AiFieldBlock>

        <AiFieldBlock label={`کلید API (${active.label})`}>
          <input
            type="password"
            dir="ltr"
            autoComplete="off"
            className="field-input font-mono text-small"
            value={activeForm.apiKeyInput}
            onChange={(e) => setProviderField({ apiKeyInput: e.target.value })}
            placeholder={activeMeta?.hasApiKey ? 'برای تغییر، کلید جدید وارد کنید' : active.keyPlaceholder}
          />
          {activeMeta?.apiKeyPreview && !activeForm.apiKeyInput && (
            <p className="mt-2 text-caption text-text-muted" dir="ltr">
              کلید فعلی: {activeMeta.apiKeyPreview}
            </p>
          )}
        </AiFieldBlock>

        <div className="grid gap-4 sm:grid-cols-2">
          <AiFieldBlock label="مدل">
            <div className="flex gap-2">
              <input
                dir="ltr"
                list={modelListId}
                className="field-input min-w-0 flex-1 font-mono text-small"
                value={activeForm.model}
                onChange={(e) => setProviderField({ model: e.target.value })}
                placeholder={active.defaultModel || 'model-name'}
              />
              {form.provider === 'gemini' && (
                <button
                  type="button"
                  onClick={() => setModelsModalOpen(true)}
                  className="btn btn-secondary shrink-0 px-3 py-2 text-small"
                  title="لیست مدل‌های Gemini"
                >
                  <List className="h-4 w-4" />
                </button>
              )}
            </div>
            {active.models.length > 0 && (
              <datalist id={modelListId}>
                {active.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </AiFieldBlock>

          <AiFieldBlock label={`Temperature (${activeForm.temperature})`}>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.1}
              value={activeForm.temperature}
              onChange={(e) => setProviderField({ temperature: Number(e.target.value) })}
              className="mt-1 w-full accent-[var(--color-primary)]"
            />
          </AiFieldBlock>
        </div>

        <AiFieldBlock label="Base URL" hint="برای OpenRouter، Azure، پروکسی و API سازگار با OpenAI">
          <input
            dir="ltr"
            className="field-input font-mono text-small"
            value={activeForm.baseUrl}
            onChange={(e) => setProviderField({ baseUrl: e.target.value })}
            placeholder={active.defaultBaseUrl || 'https://...'}
          />
        </AiFieldBlock>

        <AiActionBar
          onTest={onTest}
          onSave={onSave}
          testStatus={testStatus}
          saveStatus={saveStatus}
          saveLabel="ذخیره متن و مقاله"
          saveMessage={saveMessage}
          testMessage={testMessage}
          onShowDetails={onShowDetails}
          hint="تست با کلید تایپ‌شده انجام می‌شود. پس از تست موفق، تنظیمات خودکار ذخیره می‌شود."
        />
      </div>

      {form.provider === 'gemini' && (
        <GeminiModelsModal
          open={modelsModalOpen}
          onClose={() => setModelsModalOpen(false)}
          filter="chat"
          geminiApiKeyInput={activeForm.apiKeyInput || undefined}
          baseUrl={activeForm.baseUrl || undefined}
          onSelect={(modelId) => setProviderField({ model: modelId })}
        />
      )}
    </AiSection>
  );
}
