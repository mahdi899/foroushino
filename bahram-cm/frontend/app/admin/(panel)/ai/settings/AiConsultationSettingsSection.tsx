'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  AI_PROVIDERS,
  DEFAULT_CONSULTATION_AI_SETTINGS,
  DEFAULT_CONSULTATION_SYSTEM_PROMPT,
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
  AiToggleRow,
} from './AiSettingsShared';

export type AiConsultationSettingsForm = {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput: string;
  customInstructions: string;
};

export type AiConsultationSettingsMeta = {
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  envFallback: boolean;
  keySource: 'panel' | 'env' | 'none';
};

export const DEFAULT_AI_CONSULTATION_FORM: AiConsultationSettingsForm = {
  enabled: DEFAULT_CONSULTATION_AI_SETTINGS.enabled,
  provider: DEFAULT_CONSULTATION_AI_SETTINGS.provider,
  model: DEFAULT_CONSULTATION_AI_SETTINGS.model,
  baseUrl: DEFAULT_CONSULTATION_AI_SETTINGS.baseUrl,
  temperature: DEFAULT_CONSULTATION_AI_SETTINGS.temperature,
  apiKeyInput: '',
  customInstructions: '',
};

export const DEFAULT_AI_CONSULTATION_META: AiConsultationSettingsMeta = {
  hasApiKey: false,
  apiKeyPreview: null,
  envFallback: false,
  keySource: 'none',
};

interface AiConsultationSettingsSectionProps {
  form: AiConsultationSettingsForm;
  meta: AiConsultationSettingsMeta;
  onChange: (form: AiConsultationSettingsForm) => void;
  onSave: () => void;
  onTest: () => void;
  saveStatus: 'idle' | 'loading' | 'saved' | 'error';
  saveMessage?: string;
  testStatus: 'idle' | 'loading' | 'ok' | 'error';
  testMessage: string;
}

export function AiConsultationSettingsSection({
  form,
  meta,
  onChange,
  onSave,
  onTest,
  saveStatus,
  saveMessage,
  testStatus,
  testMessage,
}: AiConsultationSettingsSectionProps) {
  const activeMeta = providerMeta(form.provider);
  const keyOk = meta.hasApiKey || meta.envFallback;

  return (
    <AiSection
      id="ai-consultation"
      icon={Sparkles}
      iconTone="consult"
      title="برآورد مشاوره"
      subtitle="پس از تکمیل فرم /consultation — برآورد شخصی‌سازی‌شده با نام و توضیحات کاربر"
      badge={
        <AiStatusBadge
          ok={Boolean(form.enabled && keyOk)}
          label={form.enabled && keyOk ? 'فعال' : form.enabled ? 'نیاز به کلید' : 'غیرفعال'}
        />
      }
      sidebar={
        <>
          <AiSidebarCard title="راهنما">
            <AiSidebarHint>
              <AiSidebarHintItem>
                نمایش در{' '}
                <Link href="/consultation" className="text-accent hover:underline">
                  مشاوره هوشمند
                </Link>
              </AiSidebarHintItem>
              <AiSidebarHintItem>ذخیره در لیدها برای کارشناسان</AiSidebarHintItem>
              <AiSidebarHintItem>بدون کلید اختصاصی، از AI متن/مقاله استفاده می‌شود</AiSidebarHintItem>
            </AiSidebarHint>
          </AiSidebarCard>
          <AiSidebarCard title="پرامپت پایه">
            <p className="max-h-36 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-text-muted">
              {DEFAULT_CONSULTATION_SYSTEM_PROMPT.slice(0, 280)}…
            </p>
          </AiSidebarCard>
        </>
      }
    >
      <div className="grid gap-4">
        <AiToggleRow
          checked={form.enabled}
          onChange={(enabled) => onChange({ ...form, enabled })}
          label="فعال‌سازی برآورد هوشمند"
          description="نمایش برآورد AI زیر نتیجه مشاوره و ذخیره در لید"
        />

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

        <AiFieldBlock label={`کلید API (${activeMeta.brand})`} hint="اختیاری — در صورت خالی بودن از کلید بخش متن/مقاله استفاده می‌شود">
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
        </AiFieldBlock>

        <AiFieldBlock label="دستورالعمل‌های اضافی" hint="به پرامپت پایه اضافه می‌شود">
          <textarea
            className="field-input min-h-[100px] text-small leading-7"
            value={form.customInstructions}
            onChange={(e) => onChange({ ...form, customInstructions: e.target.value })}
            placeholder="مثلاً: برای پاسخ «خدمات VIP» همیشه گزینه VIP را پیشنهاد بده."
          />
        </AiFieldBlock>

        <AiActionBar
          onTest={onTest}
          onSave={onSave}
          saveLabel="ذخیره برآورد مشاوره"
          testStatus={testStatus}
          saveStatus={saveStatus}
          saveMessage={saveMessage}
          testMessage={testMessage}
        />
      </div>
    </AiSection>
  );
}
