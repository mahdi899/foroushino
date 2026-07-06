'use client';

import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import {
  AI_PROVIDERS,
  DEFAULT_CHATBOT_AI_SETTINGS,
  providerMeta,
  type AiProvider,
} from '@/lib/ai/types';
import {
  AiActionBar,
  AiFieldBlock,
  AiSection,
  AiSidebarCard,
  AiSidebarHint,
  AiSidebarHintItem,
  AiStatusBadge,
} from './AiSettingsShared';

export type AiChatbotSettingsForm = {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput: string;
};

export type AiChatbotSettingsMeta = {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  envFallback: boolean;
  keySource: 'panel' | 'env' | 'none';
};

export const DEFAULT_AI_CHATBOT_FORM: AiChatbotSettingsForm = {
  provider: DEFAULT_CHATBOT_AI_SETTINGS.provider,
  model: DEFAULT_CHATBOT_AI_SETTINGS.model,
  baseUrl: DEFAULT_CHATBOT_AI_SETTINGS.baseUrl,
  temperature: DEFAULT_CHATBOT_AI_SETTINGS.temperature,
  apiKeyInput: '',
};

export const DEFAULT_AI_CHATBOT_META: AiChatbotSettingsMeta = {
  hasApiKey: false,
  apiKeyPreview: null,
  envFallback: false,
  keySource: 'none',
};

interface AiChatbotSettingsSectionProps {
  form: AiChatbotSettingsForm;
  meta: AiChatbotSettingsMeta;
  onChange: (form: AiChatbotSettingsForm) => void;
  onSave: () => void;
  onTest: () => void;
  saveStatus: 'idle' | 'loading' | 'saved' | 'error';
  saveMessage?: string;
  testStatus: 'idle' | 'loading' | 'ok' | 'error';
  testMessage: string;
}

export function AiChatbotSettingsSection({
  form,
  meta,
  onChange,
  onSave,
  onTest,
  saveStatus,
  saveMessage,
  testStatus,
  testMessage,
}: AiChatbotSettingsSectionProps) {
  const activeMeta = providerMeta(form.provider);
  const keyOk = meta.hasApiKey || meta.envFallback;

  return (
    <AiSection
      id="ai-chatbot"
      icon={MessageSquare}
      iconTone="chat"
      title="چت‌بات سایت"
      subtitle="دستیار شناور — API جدا از مقاله و مشاوره"
      badge={<AiStatusBadge ok={keyOk} label={keyOk ? 'پیکربندی شده' : 'نیاز به کلید'} />}
      sidebar={
        <>
          <AiSidebarCard title="راهنما">
            <AiSidebarHint>
              <AiSidebarHintItem>کلید چت‌بات از کلید مقاله جدا است</AiSidebarHintItem>
              <AiSidebarHintItem>
                ظاهر ویجت در{' '}
                <Link href="/admin/chatbot" className="text-accent hover:underline">
                  تنظیمات چت‌بات
                </Link>
              </AiSidebarHintItem>
            </AiSidebarHint>
          </AiSidebarCard>
          <AiSidebarCard title="Env اختیاری">
            <p className="font-mono text-[11px] leading-5 text-text-muted" dir="ltr">
              CHATBOT_GEMINI_API_KEY
              <br />
              CHATBOT_OPENAI_API_KEY
            </p>
          </AiSidebarCard>
        </>
      }
    >
      <div className="grid gap-4">
        <AiFieldBlock label="ارائه‌دهنده" hint={activeMeta.hint}>
          <select
            className="field-input"
            value={form.provider}
            onChange={(e) => {
              const provider = e.target.value as AiProvider;
              const pm = providerMeta(provider);
              onChange({
                ...form,
                provider,
                model: pm.defaultModel,
                baseUrl: pm.defaultBaseUrl,
                apiKeyInput: '',
              });
            }}
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </AiFieldBlock>

        <div className="grid gap-4 sm:grid-cols-2">
          <AiFieldBlock label="مدل">
            <select className="field-input" value={form.model} onChange={(e) => onChange({ ...form, model: e.target.value })}>
              {activeMeta.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {!activeMeta.models.includes(form.model) && form.model && (
                <option value={form.model}>{form.model}</option>
              )}
            </select>
          </AiFieldBlock>
          <AiFieldBlock label="Temperature">
            <input
              type="number"
              min={0}
              max={2}
              step={0.1}
              className="field-input"
              value={form.temperature}
              onChange={(e) => onChange({ ...form, temperature: Number(e.target.value) })}
            />
          </AiFieldBlock>
        </div>

        <AiFieldBlock label="Base URL">
          <input
            className="field-input font-mono text-small"
            value={form.baseUrl}
            onChange={(e) => onChange({ ...form, baseUrl: e.target.value })}
            dir="ltr"
          />
        </AiFieldBlock>

        <AiFieldBlock label={`کلید API (${activeMeta.brand})`}>
          <input
            type="password"
            autoComplete="off"
            className="field-input font-mono text-small"
            placeholder={activeMeta.keyPlaceholder}
            value={form.apiKeyInput}
            onChange={(e) => onChange({ ...form, apiKeyInput: e.target.value })}
            dir="ltr"
          />
          {meta.hasApiKey && !form.apiKeyInput && meta.apiKeyPreview && (
            <p className="mt-2 text-caption text-text-muted" dir="ltr">
              ذخیره‌شده: {meta.apiKeyPreview}
            </p>
          )}
          {meta.envFallback && !meta.hasApiKey && !form.apiKeyInput.trim() && (
            <p className="mt-2 text-caption text-text-muted" dir="ltr">
              fallback: CHATBOT_{form.provider.toUpperCase()}_API_KEY
            </p>
          )}
        </AiFieldBlock>

        <AiActionBar
          onTest={onTest}
          onSave={onSave}
          testLabel="تست چت‌بات"
          saveLabel="ذخیره چت‌بات"
          testStatus={testStatus}
          saveStatus={saveStatus}
          saveMessage={saveMessage}
          testMessage={testMessage}
        />
      </div>
    </AiSection>
  );
}
