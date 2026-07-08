'use server';

import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import { SERVER_API_URL } from '@/lib/api/config';
import {
  AI_PROVIDERS,
  DEFAULT_AI_CONFIG,
  DEFAULT_IMAGE_SETTINGS,
  DEFAULT_CHATBOT_AI_SETTINGS,
  defaultProviders,
  providerMeta,
  type AiChatbotSettings,
  type AiConfig,
  type AiConfigAdminView,
  type AiImageSettings,
  type AiProvider,
  type AiProviderConfig,
} from './types';

const AI_GROUP = 'ai';
const AI_KEY = 'config';

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

/** Accepts both the new multi-provider shape and the legacy `{ openai: {...} }` shape. */
function mergeConfig(raw: (Partial<AiConfig> & { openai?: Partial<AiProviderConfig> }) | null): AiConfig {
  const providers = defaultProviders();

  if (raw?.providers) {
    for (const meta of AI_PROVIDERS) {
      const stored = raw.providers[meta.id];
      if (stored) providers[meta.id] = { ...providers[meta.id], ...stored };
    }
  } else if (raw?.openai) {
    providers.openai = { ...providers.openai, ...raw.openai };
  }

  return {
    enabled: raw?.enabled ?? DEFAULT_AI_CONFIG.enabled,
    provider: raw?.provider ?? DEFAULT_AI_CONFIG.provider,
    providers,
    image: {
      engine: raw?.image?.engine ?? DEFAULT_IMAGE_SETTINGS.engine,
      model: raw?.image?.model?.trim() || DEFAULT_IMAGE_SETTINGS.model,
      googleApiKey: raw?.image?.googleApiKey?.trim() || undefined,
      openaiApiKey: raw?.image?.openaiApiKey?.trim() || undefined,
      baseUrl: raw?.image?.baseUrl?.trim() || undefined,
    },
    chatbot: mergeChatbotConfig(raw?.chatbot),
  };
}

function mergeChatbotConfig(raw: Partial<AiChatbotSettings> | null | undefined): AiChatbotSettings {
  const provider = raw?.provider ?? DEFAULT_CHATBOT_AI_SETTINGS.provider;
  const meta = providerMeta(provider);
  return {
    provider,
    model: raw?.model?.trim() || DEFAULT_CHATBOT_AI_SETTINGS.model || meta.defaultModel,
    baseUrl: raw?.baseUrl?.trim() || DEFAULT_CHATBOT_AI_SETTINGS.baseUrl || meta.defaultBaseUrl,
    temperature: Number.isFinite(raw?.temperature)
      ? Math.min(2, Math.max(0, raw!.temperature!))
      : DEFAULT_CHATBOT_AI_SETTINGS.temperature,
    apiKeys: raw?.apiKeys ?? {},
  };
}

function envKeyFor(provider: AiProvider): string | null {
  for (const name of providerMeta(provider).envKeys) {
    const val = process.env[name]?.trim();
    if (val) return val;
  }
  return null;
}

function chatbotEnvKeyFor(provider: AiProvider): string | null {
  const dedicated: Record<AiProvider, string> = {
    openai: 'CHATBOT_OPENAI_API_KEY',
    gemini: 'CHATBOT_GEMINI_API_KEY',
    anthropic: 'CHATBOT_ANTHROPIC_API_KEY',
    custom: 'CHATBOT_CUSTOM_API_KEY',
  };
  const val = process.env[dedicated[provider]]?.trim();
  return val || null;
}

function resolveChatbotApiKey(config: AiConfig, provider: AiProvider): {
  apiKey: string | null;
  keySource: 'panel' | 'env' | 'none';
} {
  const panelKey = config.chatbot?.apiKeys?.[provider]?.trim();
  if (panelKey) return { apiKey: panelKey, keySource: 'panel' };
  const envKey = chatbotEnvKeyFor(provider);
  if (envKey) return { apiKey: envKey, keySource: 'env' };
  return { apiKey: null, keySource: 'none' };
}

function resolveApiKey(
  config: AiConfig,
  provider: AiProvider,
): { apiKey: string | null; keySource: AiConfigAdminView['keySource'] } {
  const panelKey = config.providers[provider]?.apiKey?.trim();
  const envKey = envKeyFor(provider);

  if (panelKey) return { apiKey: panelKey, keySource: 'panel' };
  if (envKey) return { apiKey: envKey, keySource: 'env' };
  return { apiKey: null, keySource: 'none' };
}

export async function getStoredAiConfig(): Promise<AiConfig> {
  const raw = await getSettingBlob<Partial<AiConfig>>(AI_GROUP, AI_KEY);
  return mergeConfig(raw);
}

export async function getAiConfigAdminView(): Promise<AiConfigAdminView> {
  const config = await getStoredAiConfig();

  const providers = AI_PROVIDERS.reduce(
    (acc, meta) => {
      const cfg = config.providers[meta.id];
      const panelKey = cfg.apiKey?.trim();
      acc[meta.id] = {
        model: cfg.model,
        baseUrl: cfg.baseUrl,
        temperature: cfg.temperature,
        hasApiKey: Boolean(panelKey),
        apiKeyPreview: panelKey ? maskApiKey(panelKey) : null,
        envFallback: Boolean(envKeyFor(meta.id)),
      };
      return acc;
    },
    {} as AiConfigAdminView['providers'],
  );

  const { keySource } = resolveApiKey(config, config.provider);
  const image = config.image ?? { ...DEFAULT_IMAGE_SETTINGS };
  const googlePanelKey = image.googleApiKey?.trim();
  const openaiPanelKey = image.openaiApiKey?.trim();
  const chatbot = config.chatbot ?? { ...DEFAULT_CHATBOT_AI_SETTINGS };
  const chatbotKey = chatbot.apiKeys?.[chatbot.provider]?.trim();
  const chatbotKeyResolved = resolveChatbotApiKey(config, chatbot.provider);

  return {
    enabled: config.enabled,
    provider: config.provider,
    providers,
    keySource,
    image,
    imageKeys: {
      hasGoogleApiKey: Boolean(googlePanelKey),
      googleApiKeyPreview: googlePanelKey ? maskApiKey(googlePanelKey) : null,
      googleEnvFallback: Boolean(
        process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim(),
      ),
      hasOpenaiApiKey: Boolean(openaiPanelKey),
      openaiApiKeyPreview: openaiPanelKey ? maskApiKey(openaiPanelKey) : null,
      openaiEnvFallback: Boolean(process.env.OPENAI_API_KEY?.trim()),
    },
    chatbot,
    chatbotKeys: {
      hasApiKey: Boolean(chatbotKey),
      apiKeyPreview: chatbotKey ? maskApiKey(chatbotKey) : null,
      envFallback: chatbotKeyResolved.keySource === 'env',
      keySource: chatbotKeyResolved.keySource,
    },
  };
}

export interface ResolvedAiRuntime {
  enabled: boolean;
  provider: AiProvider;
  apiStyle: ReturnType<typeof providerMeta>['apiStyle'];
  active: Omit<AiProviderConfig, 'apiKey'> & { apiKey: string | null };
  keySource: AiConfigAdminView['keySource'];
}

/** Runtime config for site chatbot — uses chatbot-only API keys. */
export async function getResolvedChatbotAiRuntime(): Promise<ResolvedAiRuntime> {
  const remote = await fetchChatbotAiRuntimeFromLaravel();
  if (remote) return remote;

  const config = await getStoredAiConfig();
  return resolveChatbotRuntimeFromConfig(config);
}

async function fetchChatbotAiRuntimeFromLaravel(): Promise<ResolvedAiRuntime | null> {
  const secret = process.env.REVALIDATE_SECRET?.trim() || '';

  try {
    const res = await fetch(`${SERVER_API_URL}/chatbot/ai-runtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: '{}',
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const json = (await res.json()) as { data?: ResolvedAiRuntime };
    if (!json.data?.active) return null;

    return json.data;
  } catch {
    return null;
  }
}

export async function getResolvedChatbotAiRuntimeFromDraft(input: {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput?: string;
}): Promise<ResolvedAiRuntime> {
  const stored = await getStoredAiConfig();
  const provider = input.provider;
  const draftKey = input.apiKeyInput?.trim();
  const storedKey = stored.chatbot?.apiKeys?.[provider]?.trim();
  const envKey = chatbotEnvKeyFor(provider);
  const apiKey = draftKey || storedKey || envKey || null;
  const keySource: AiConfigAdminView['chatbotKeys']['keySource'] =
    draftKey || storedKey ? 'panel' : envKey ? 'env' : 'none';
  const meta = providerMeta(provider);

  return {
    enabled: Boolean(apiKey),
    provider,
    apiStyle: meta.apiStyle,
    keySource,
    active: {
      model: input.model.trim() || meta.defaultModel,
      baseUrl: input.baseUrl.trim() || meta.defaultBaseUrl,
      temperature: input.temperature,
      apiKey,
    },
  };
}

function resolveChatbotRuntimeFromConfig(config: AiConfig): ResolvedAiRuntime {
  const chatbot = config.chatbot ?? { ...DEFAULT_CHATBOT_AI_SETTINGS };
  const provider = chatbot.provider;
  const meta = providerMeta(provider);
  const { apiKey, keySource } = resolveChatbotApiKey(config, provider);

  return {
    enabled: Boolean(apiKey),
    provider,
    apiStyle: meta.apiStyle,
    keySource,
    active: {
      model: chatbot.model || meta.defaultModel,
      baseUrl: chatbot.baseUrl || meta.defaultBaseUrl,
      temperature: chatbot.temperature,
      apiKey,
    },
  };
}

/** Runtime config for server-side article/text AI calls. */
export async function getResolvedAiRuntime(): Promise<ResolvedAiRuntime> {
  const config = await getStoredAiConfig();
  return resolveRuntimeFromConfig(config, config.provider);
}

/** Test with unsaved form values — uses typed key before save. */
export async function getResolvedAiRuntimeFromDraft(input: {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput?: string;
}): Promise<ResolvedAiRuntime> {
  const stored = await getStoredAiConfig();
  const draftKey = input.apiKeyInput?.trim();
  const storedKey = stored.providers[input.provider]?.apiKey?.trim();
  const envKey = envKeyFor(input.provider);
  const apiKey = draftKey || storedKey || envKey || null;
  const keySource: AiConfigAdminView['keySource'] = draftKey || storedKey ? 'panel' : envKey ? 'env' : 'none';

  const meta = providerMeta(input.provider);
  const cfg = stored.providers[input.provider];

  return {
    enabled: input.enabled,
    provider: input.provider,
    apiStyle: meta.apiStyle,
    keySource,
    active: {
      model: input.model.trim() || cfg?.model || meta.defaultModel,
      baseUrl: input.baseUrl.trim() || cfg?.baseUrl || meta.defaultBaseUrl,
      temperature: input.temperature,
      apiKey: input.enabled ? apiKey : null,
    },
  };
}

function resolveRuntimeFromConfig(config: AiConfig, provider: AiProvider): ResolvedAiRuntime {
  const meta = providerMeta(provider);
  const { apiKey, keySource } = resolveApiKey(config, provider);
  const cfg = config.providers[provider];

  return {
    enabled: config.enabled,
    provider,
    apiStyle: meta.apiStyle,
    keySource,
    active: {
      ...cfg,
      model: cfg.model || meta.defaultModel,
      baseUrl: cfg.baseUrl || meta.defaultBaseUrl,
      apiKey: config.enabled ? apiKey : null,
    },
  };
}

export interface SaveAiTextConfigInput {
  enabled: boolean;
  provider: AiProvider;
  providers: Record<
    AiProvider,
    { model: string; baseUrl: string; temperature: number; apiKeyInput?: string }
  >;
}

export interface SaveAiChatbotConfigInput {
  chatbot: Pick<AiChatbotSettings, 'provider' | 'model' | 'baseUrl' | 'temperature'>;
  apiKeyInput?: string;
}

export interface SaveAiImageConfigInput {
  image: Pick<AiImageSettings, 'engine' | 'model'>;
  googleApiKeyInput?: string;
  openaiApiKeyInput?: string;
  baseUrl?: string;
}

export interface SaveAiConfigInput extends SaveAiTextConfigInput {
  image?: AiImageSettings;
}

export interface ResolvedImageSettings extends Omit<AiImageSettings, 'openaiApiKey' | 'googleApiKey' | 'baseUrl'> {
  apiKey: string | null;
  baseUrl: string;
  openaiApiKey: string | null;
  openaiBaseUrl: string;
}

/** Runtime config for AI image generation. */
export async function getResolvedImageSettings(): Promise<ResolvedImageSettings> {
  const config = await getStoredAiConfig();
  const image = config.image ?? { ...DEFAULT_IMAGE_SETTINGS };
  const geminiKey =
    image.googleApiKey?.trim() ||
    config.providers.gemini.apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null;
  const openaiKey =
    image.openaiApiKey?.trim() ||
    config.providers.openai.apiKey?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;

  return {
    engine: image.engine,
    model: image.model.trim() || DEFAULT_IMAGE_SETTINGS.model,
    apiKey: geminiKey,
    baseUrl: image.baseUrl?.trim() || config.providers.gemini.baseUrl?.trim() || providerMeta('gemini').defaultBaseUrl,
    openaiApiKey: openaiKey,
    openaiBaseUrl: config.providers.openai.baseUrl?.trim() || 'https://api.openai.com/v1',
  };
}

/** Resolve image settings from unsaved admin form (test before save). */
export async function getResolvedImageSettingsFromDraft(input: {
  image: AiImageSettings;
  geminiApiKeyInput?: string;
  openaiApiKeyInput?: string;
  baseUrl?: string;
}): Promise<ResolvedImageSettings> {
  const stored = await getStoredAiConfig();
  const storedImage = stored.image ?? { ...DEFAULT_IMAGE_SETTINGS };
  const geminiKey =
    input.geminiApiKeyInput?.trim() ||
    storedImage.googleApiKey?.trim() ||
    stored.providers.gemini.apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null;
  const openaiKey =
    input.openaiApiKeyInput?.trim() ||
    storedImage.openaiApiKey?.trim() ||
    stored.providers.openai.apiKey?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;

  return {
    engine: input.image.engine,
    model: input.image.model.trim() || DEFAULT_IMAGE_SETTINGS.model,
    apiKey: geminiKey,
    baseUrl:
      input.baseUrl?.trim() ||
      storedImage.baseUrl?.trim() ||
      stored.providers.gemini.baseUrl?.trim() ||
      providerMeta('gemini').defaultBaseUrl,
    openaiApiKey: openaiKey,
    openaiBaseUrl: stored.providers.openai.baseUrl?.trim() || 'https://api.openai.com/v1',
  };
}

export async function saveAiTextConfig(input: SaveAiTextConfigInput): Promise<{ ok: boolean; error?: string }> {
  const current = await getStoredAiConfig();
  const providers = defaultProviders();

  for (const meta of AI_PROVIDERS) {
    const incoming = input.providers[meta.id];
    const existing = current.providers[meta.id];
    const nextKey = incoming?.apiKeyInput?.trim();

    const cfg: AiProviderConfig = {
      model: (incoming?.model ?? '').trim() || meta.defaultModel,
      baseUrl: (incoming?.baseUrl ?? '').trim() || meta.defaultBaseUrl,
      temperature: Number.isFinite(incoming?.temperature)
        ? Math.min(2, Math.max(0, incoming!.temperature))
        : 0.7,
    };

    if (nextKey) cfg.apiKey = nextKey;
    else if (existing?.apiKey) cfg.apiKey = existing.apiKey;

    providers[meta.id] = cfg;
  }

  const config: AiConfig = {
    enabled: input.enabled,
    provider: input.provider,
    providers,
    image: current.image ?? { ...DEFAULT_IMAGE_SETTINGS },
    chatbot: current.chatbot ?? { ...DEFAULT_CHATBOT_AI_SETTINGS },
  };

  return saveSettingBlob(AI_GROUP, AI_KEY, config);
}

export async function saveAiImageConfig(input: SaveAiImageConfigInput): Promise<{ ok: boolean; error?: string }> {
  const current = await getStoredAiConfig();
  const prev = current.image ?? { ...DEFAULT_IMAGE_SETTINGS };

  const image: AiImageSettings = {
    engine: input.image.engine,
    model: input.image.model.trim() || DEFAULT_IMAGE_SETTINGS.model,
    baseUrl: (input.baseUrl ?? '').trim() || prev.baseUrl,
  };

  const googleInput = input.googleApiKeyInput?.trim();
  const openaiInput = input.openaiApiKeyInput?.trim();
  if (googleInput) image.googleApiKey = googleInput;
  else if (prev.googleApiKey) image.googleApiKey = prev.googleApiKey;

  if (openaiInput) image.openaiApiKey = openaiInput;
  else if (prev.openaiApiKey) image.openaiApiKey = prev.openaiApiKey;

  return saveSettingBlob(AI_GROUP, AI_KEY, { ...current, image, chatbot: current.chatbot ?? { ...DEFAULT_CHATBOT_AI_SETTINGS } });
}

export async function saveAiChatbotConfig(input: SaveAiChatbotConfigInput): Promise<{ ok: boolean; error?: string }> {
  const current = await getStoredAiConfig();
  const prev = current.chatbot ?? { ...DEFAULT_CHATBOT_AI_SETTINGS };
  const provider = input.chatbot.provider;
  const meta = providerMeta(provider);

  const apiKeys: Partial<Record<AiProvider, string>> = { ...(prev.apiKeys ?? {}) };
  const nextKey = input.apiKeyInput?.trim();
  if (nextKey) apiKeys[provider] = nextKey;

  const chatbot: AiChatbotSettings = {
    provider,
    model: input.chatbot.model.trim() || meta.defaultModel,
    baseUrl: input.chatbot.baseUrl.trim() || meta.defaultBaseUrl,
    temperature: Number.isFinite(input.chatbot.temperature)
      ? Math.min(2, Math.max(0, input.chatbot.temperature))
      : prev.temperature,
    apiKeys,
  };

  return saveSettingBlob(AI_GROUP, AI_KEY, { ...current, chatbot });
}

export async function saveAiConfig(input: SaveAiConfigInput): Promise<{ ok: boolean; error?: string }> {
  const textRes = await saveAiTextConfig(input);
  if (!textRes.ok) return textRes;

  if (!input.image) return textRes;

  return saveAiImageConfig({
    image: { engine: input.image.engine, model: input.image.model },
    googleApiKeyInput: input.image.googleApiKey,
    openaiApiKeyInput: input.image.openaiApiKey,
    baseUrl: input.image.baseUrl,
  });
}
