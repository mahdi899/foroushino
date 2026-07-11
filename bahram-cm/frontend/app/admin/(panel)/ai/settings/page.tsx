'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, ImageIcon, Loader2, MessageSquare, Save } from 'lucide-react';
import { AdminPage } from '../../ui';
import {
  loadAiSettings,
  persistAiChatbotSettings,
  persistAiImageSettings,
  persistAiTextSettings,
  testAiConnection,
  testChatbotConnection,
  testAiImageGeneration,
} from '../../settings/actions';
import {
  AiSettingsSection,
  DEFAULT_AI_FORM,
  DEFAULT_AI_META,
  type AiSettingsForm,
  type AiSettingsMeta,
  type ProviderForm,
} from '../../settings/AiSettingsSection';
import {
  AiImageSettingsSection,
  DEFAULT_AI_IMAGE_FORM,
  DEFAULT_AI_IMAGE_META,
  type AiImageSettingsForm,
  type AiImageSettingsMeta,
} from './AiImageSettingsSection';
import {
  AiChatbotSettingsSection,
  DEFAULT_AI_CHATBOT_FORM,
  DEFAULT_AI_CHATBOT_META,
  type AiChatbotSettingsForm,
  type AiChatbotSettingsMeta,
} from './AiChatbotSettingsSection';
import { AiErrorModal } from '../../settings/AiErrorModal';
import { AiOverviewCards, AiSettingsNav } from './AiSettingsShared';
import { AI_PROVIDERS, providerMeta, type AiConfigAdminView, type AiErrorDetail, type AiProvider } from '@/lib/ai/types';
import { resolveMediaUrl } from '@/lib/mediaUrl';

function viewToTextForm(view: AiConfigAdminView): { form: AiSettingsForm; meta: AiSettingsMeta } {
  const providers = {} as AiSettingsForm['providers'];
  const metaProviders = {} as AiSettingsMeta['providers'];
  for (const p of AI_PROVIDERS) {
    const pv = view.providers[p.id];
    providers[p.id] = {
      model: pv.model,
      baseUrl: pv.baseUrl,
      temperature: pv.temperature,
      apiKeyInput: '',
    } satisfies ProviderForm;
    metaProviders[p.id] = {
      hasApiKey: pv.hasApiKey,
      apiKeyPreview: pv.apiKeyPreview,
      envFallback: pv.envFallback,
    };
  }
  return {
    form: {
      enabled: view.enabled,
      provider: view.provider,
      providers,
      image: { engine: view.image.engine, model: view.image.model },
    },
    meta: { providers: metaProviders, keySource: view.keySource },
  };
}

function viewToImageForm(view: AiConfigAdminView): { form: AiImageSettingsForm; meta: AiImageSettingsMeta } {
  return {
    form: {
      engine: view.image.engine,
      model: view.image.model,
      baseUrl: view.image.baseUrl?.trim() || providerMeta('gemini').defaultBaseUrl,
      googleApiKeyInput: '',
      openaiApiKeyInput: '',
    },
    meta: view.imageKeys,
  };
}

function buildProvidersPayload(form: AiSettingsForm) {
  const providersPayload = {} as Record<
    AiProvider,
    { model: string; baseUrl: string; temperature: number; apiKeyInput?: string }
  >;
  for (const p of AI_PROVIDERS) {
    const pf = form.providers[p.id];
    providersPayload[p.id] = {
      model: pf.model,
      baseUrl: pf.baseUrl,
      temperature: pf.temperature,
      apiKeyInput: pf.apiKeyInput || undefined,
    };
  }
  return providersPayload;
}

function viewToChatbotForm(view: AiConfigAdminView): { form: AiChatbotSettingsForm; meta: AiChatbotSettingsMeta } {
  return {
    form: {
      provider: view.chatbot.provider,
      model: view.chatbot.model,
      baseUrl: view.chatbot.baseUrl,
      temperature: view.chatbot.temperature,
      apiKeyInput: '',
    },
    meta: view.chatbotKeys,
  };
}

export default function AiSettingsPage() {
  const [textForm, setTextForm] = useState<AiSettingsForm>(DEFAULT_AI_FORM);
  const [textMeta, setTextMeta] = useState<AiSettingsMeta>(DEFAULT_AI_META);
  const [imageForm, setImageForm] = useState<AiImageSettingsForm>(DEFAULT_AI_IMAGE_FORM);
  const [imageMeta, setImageMeta] = useState<AiImageSettingsMeta>(DEFAULT_AI_IMAGE_META);
  const [chatbotForm, setChatbotForm] = useState<AiChatbotSettingsForm>(DEFAULT_AI_CHATBOT_FORM);
  const [chatbotMeta, setChatbotMeta] = useState<AiChatbotSettingsMeta>(DEFAULT_AI_CHATBOT_META);

  const [textSaveStatus, setTextSaveStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [textSaveMessage, setTextSaveMessage] = useState('');
  const [imageSaveStatus, setImageSaveStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [imageSaveMessage, setImageSaveMessage] = useState('');
  const [chatbotSaveStatus, setChatbotSaveStatus] = useState<'idle' | 'loading' | 'saved' | 'error'>('idle');
  const [chatbotSaveMessage, setChatbotSaveMessage] = useState('');
  const [chatbotTestStatus, setChatbotTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [chatbotTestMessage, setChatbotTestMessage] = useState('');

  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorDetail, setErrorDetail] = useState<AiErrorDetail | null>(null);
  const [testSuccess, setTestSuccess] = useState<{ model: string; provider?: string; saved?: boolean } | null>(null);

  const [imageTestStatus, setImageTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [imageTestMessage, setImageTestMessage] = useState('');
  const [imageTestPreviewUrl, setImageTestPreviewUrl] = useState('');

  const activeKeyInput = textForm.providers[textForm.provider]?.apiKeyInput?.trim() ?? '';
  const hasUnsavedKey = Boolean(activeKeyInput);

  useEffect(() => {
    loadAiSettings().then((view) => {
      const text = viewToTextForm(view);
      const image = viewToImageForm(view);
      const chatbot = viewToChatbotForm(view);
      setTextForm(text.form);
      setTextMeta(text.meta);
      setImageForm(image.form);
      setImageMeta(image.meta);
      setChatbotForm(chatbot.form);
      setChatbotMeta(chatbot.meta);
    });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'ai' || hash === 'ai-image' || hash === 'ai-chatbot') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  async function reloadFromServer(currentProvider: AiProvider) {
    const view = await loadAiSettings();
    const text = viewToTextForm(view);
    const image = viewToImageForm(view);
    const chatbot = viewToChatbotForm(view);
    setTextForm({ ...text.form, provider: currentProvider });
    setTextMeta(text.meta);
    setImageForm(image.form);
    setImageMeta(image.meta);
    setChatbotForm(chatbot.form);
    setChatbotMeta(chatbot.meta);
  }

  async function saveTextOnly(): Promise<{ ok: boolean; error?: string }> {
    setTextSaveStatus('loading');
    setTextSaveMessage('');
    const res = await persistAiTextSettings({
      enabled: textForm.enabled,
      provider: textForm.provider,
      providers: buildProvidersPayload(textForm),
    });
    if (res.ok) {
      await reloadFromServer(textForm.provider);
      setTextSaveStatus('saved');
      setTextSaveMessage('تنظیمات متن و مقاله ذخیره شد.');
      setTimeout(() => setTextSaveStatus('idle'), 2200);
    } else {
      setTextSaveStatus('error');
      setTextSaveMessage(res.error ?? 'ذخیره ناموفق بود.');
    }
    return res;
  }

  async function saveImageOnly(): Promise<{ ok: boolean; error?: string }> {
    setImageSaveStatus('loading');
    setImageSaveMessage('');
    const res = await persistAiImageSettings({
      image: { engine: imageForm.engine, model: imageForm.model },
      googleApiKeyInput: imageForm.googleApiKeyInput || undefined,
      openaiApiKeyInput: imageForm.openaiApiKeyInput || undefined,
      baseUrl: imageForm.baseUrl || undefined,
    });
    if (res.ok) {
      const view = await loadAiSettings();
      const image = viewToImageForm(view);
      setImageForm(image.form);
      setImageMeta(image.meta);
      setImageSaveStatus('saved');
      setImageSaveMessage('تنظیمات تولید تصویر ذخیره شد.');
      setTimeout(() => setImageSaveStatus('idle'), 2200);
    } else {
      setImageSaveStatus('error');
      setImageSaveMessage(res.error ?? 'ذخیره ناموفق بود.');
    }
    return res;
  }

  async function saveChatbotOnly(): Promise<{ ok: boolean; error?: string }> {
    setChatbotSaveStatus('loading');
    setChatbotSaveMessage('');
    const res = await persistAiChatbotSettings({
      chatbot: {
        provider: chatbotForm.provider,
        model: chatbotForm.model,
        baseUrl: chatbotForm.baseUrl,
        temperature: chatbotForm.temperature,
      },
      apiKeyInput: chatbotForm.apiKeyInput || undefined,
    });
    if (res.ok) {
      const view = await loadAiSettings();
      const chatbot = viewToChatbotForm(view);
      setChatbotForm(chatbot.form);
      setChatbotMeta(chatbot.meta);
      setChatbotSaveStatus('saved');
      setChatbotSaveMessage('تنظیمات چت‌بات ذخیره شد.');
      setTimeout(() => setChatbotSaveStatus('idle'), 2200);
    } else {
      setChatbotSaveStatus('error');
      setChatbotSaveMessage(res.error ?? 'ذخیره ناموفق بود.');
    }
    return res;
  }

  async function saveAll() {
    const [textRes, imageRes, chatbotRes] = await Promise.all([
      saveTextOnly(),
      saveImageOnly(),
      saveChatbotOnly(),
    ]);
    if (textRes.ok && imageRes.ok && chatbotRes.ok) {
      setTextSaveMessage('همه تنظیمات AI ذخیره شد.');
      setImageSaveMessage('');
      setChatbotSaveMessage('');
    }
  }

  async function handleTestConnection() {
    setTestStatus('loading');
    setTestMessage('');
    setErrorDetail(null);
    setTestSuccess(null);
    setTextSaveMessage('');

    const pf = textForm.providers[textForm.provider];
    const res = await testAiConnection({
      enabled: textForm.enabled,
      provider: textForm.provider,
      model: pf.model,
      baseUrl: pf.baseUrl,
      temperature: pf.temperature,
      apiKeyInput: pf.apiKeyInput || undefined,
    });

    if (res.ok) {
      setTestStatus('ok');
      const saveRes = await saveTextOnly();
      if (saveRes.ok) {
        setTestMessage(`اتصال موفق — ${res.provider} / ${res.model} — کلید ذخیره شد`);
        setTestSuccess({ model: res.model, provider: res.provider, saved: true });
      } else {
        setTestMessage(`اتصال موفق، اما ذخیره ناموفق: ${saveRes.error ?? 'خطای نامشخص'}`);
        setTestSuccess({ model: res.model, provider: res.provider, saved: false });
        setErrorDetail({
          summary: saveRes.error ?? 'ذخیره تنظیمات AI ناموفق بود.',
          provider: textForm.provider,
          model: pf.model,
          endpoint: pf.baseUrl,
          hints: ['مطمئن شوید Laravel روی پورت ۸۰۰۰ در حال اجراست.', 'دسترسی settings.manage لازم است.'],
        });
      }
      setErrorModalOpen(true);
    } else {
      setTestStatus('error');
      setTestMessage(res.error);
      setErrorDetail(
        res.detail ?? {
          summary: res.error,
          provider: textForm.provider,
          model: pf.model,
          endpoint: pf.baseUrl,
          hints: ['کلید API را بررسی کنید.', 'مدل و Base URL را چک کنید.'],
        },
      );
      setErrorModalOpen(true);
    }
  }

  async function handleTestImage() {
    setImageTestStatus('loading');
    setImageTestMessage('');
    setImageTestPreviewUrl('');

    const res = await testAiImageGeneration({
      image: { engine: imageForm.engine, model: imageForm.model },
      geminiApiKeyInput: imageForm.googleApiKeyInput || undefined,
      openaiApiKeyInput: imageForm.openaiApiKeyInput || undefined,
      baseUrl: imageForm.baseUrl || undefined,
    });

    if (res.ok) {
      setImageTestStatus('ok');
      setImageTestMessage(`تولید تصویر موفق — ${res.provider} / ${res.model}`);
      setImageTestPreviewUrl(resolveMediaUrl(res.url));
      await saveImageOnly();
    } else {
      setImageTestStatus('error');
      setImageTestMessage(res.error);
    }
  }

  async function handleTestChatbot() {
    setChatbotTestStatus('loading');
    setChatbotTestMessage('');
    const res = await testChatbotConnection({
      chatbot: {
        provider: chatbotForm.provider,
        model: chatbotForm.model,
        baseUrl: chatbotForm.baseUrl,
        temperature: chatbotForm.temperature,
      },
      apiKeyInput: chatbotForm.apiKeyInput || undefined,
    });
    if (res.ok) {
      setChatbotTestStatus('ok');
      setChatbotTestMessage(`اتصال چت‌بات موفق — ${res.provider} / ${res.model}`);
      await saveChatbotOnly();
    } else {
      setChatbotTestStatus('error');
      setChatbotTestMessage(res.error);
    }
  }

  const saving =
    textSaveStatus === 'loading' ||
    imageSaveStatus === 'loading' ||
    chatbotSaveStatus === 'loading';

  const overviewItems = useMemo(() => {
    const textKeyOk =
      textMeta.providers[textForm.provider]?.hasApiKey || textMeta.providers[textForm.provider]?.envFallback;
    const imageKeyOk =
      imageMeta.hasGoogleApiKey ||
      imageMeta.hasOpenaiApiKey ||
      imageMeta.googleEnvFallback ||
      imageMeta.openaiEnvFallback;
    const chatbotKeyOk = chatbotMeta.hasApiKey || chatbotMeta.envFallback;

    return [
      {
        label: 'متن و مقاله',
        value: textForm.enabled && textKeyOk ? 'فعال' : textForm.enabled ? 'نیاز به کلید' : 'غیرفعال',
        ok: Boolean(textForm.enabled && textKeyOk),
        icon: Bot,
      },
      {
        label: 'تولید تصویر',
        value: imageKeyOk ? 'پیکربندی شده' : 'نیاز به کلید',
        ok: imageKeyOk,
        icon: ImageIcon,
      },
      {
        label: 'چت‌بات',
        value: chatbotKeyOk ? 'پیکربندی شده' : 'نیاز به کلید',
        ok: chatbotKeyOk,
        icon: MessageSquare,
      },
    ];
  }, [textForm, textMeta, imageMeta, chatbotMeta]);

  return (
    <AdminPage
      title="تنظیمات هوش مصنوعی"
      desc="هر بخش سایت (مقاله، تصویر، چت‌بات) API و مدل جداگانه دارد."
      action={
        <button onClick={saveAll} disabled={saving} className="btn btn-primary gap-2 px-4 py-2 text-small">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره همه
        </button>
      }
    >
      <div className="mb-6 space-y-5">
        <AiOverviewCards items={overviewItems} />
        <AiSettingsNav />
      </div>

      <div className="flex flex-col gap-10">
        <AiSettingsSection
          form={textForm}
          meta={textMeta}
          onChange={setTextForm}
          onTest={handleTestConnection}
          onSave={saveTextOnly}
          onShowDetails={() => setErrorModalOpen(true)}
          testStatus={testStatus}
          testMessage={testMessage}
          saveStatus={textSaveStatus}
          saveMessage={textSaveMessage}
          hasUnsavedKey={hasUnsavedKey}
        />

        <AiImageSettingsSection
          form={imageForm}
          meta={imageMeta}
          onChange={setImageForm}
          onSave={saveImageOnly}
          onTestImage={handleTestImage}
          saveStatus={imageSaveStatus}
          saveMessage={imageSaveMessage}
          imageTestStatus={imageTestStatus}
          imageTestMessage={imageTestMessage}
          imageTestPreviewUrl={imageTestPreviewUrl}
        />

        <AiChatbotSettingsSection
          form={chatbotForm}
          meta={chatbotMeta}
          onChange={setChatbotForm}
          onSave={saveChatbotOnly}
          onTest={handleTestChatbot}
          saveStatus={chatbotSaveStatus}
          saveMessage={chatbotSaveMessage}
          testStatus={chatbotTestStatus}
          testMessage={chatbotTestMessage}
        />
      </div>

      <AiErrorModal
        open={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        detail={errorDetail}
        success={testSuccess}
      />
    </AdminPage>
  );
}
