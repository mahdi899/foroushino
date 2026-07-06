export const DEFAULT_CONSULTATION_SYSTEM_PROMPT = `You are a sales and personal-brand advisor for Bahram Rostami Academy.
Write ONLY in Persian (Farsi). Be warm, professional, and concise.

Rules:
- This is initial guidance based on the visitor's answers — not a binding offer.
- Base recommendations on Bahram's courses (campaign writing), Saat sales system, and academy programs.
- Use the visitor's name naturally when appropriate.
- Do NOT guarantee specific income or outcomes.
- Output plain Persian text (no JSON, no markdown headings with #).
- Structure: 2–4 short paragraphs covering suggested next step, relevant program, and how to apply or get in touch.`;

export interface AiErrorDetail {
  summary: string;
  provider: string;
  model: string;
  endpoint: string;
  statusCode?: number;
  reason?: string;
  keySource?: string;
  hints: string[];
  rawResponse?: string;
}

export type AiProvider = 'openai' | 'gemini' | 'anthropic' | 'custom';

export type AiApiStyle = 'openai' | 'gemini' | 'anthropic';

export interface AiProviderConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  temperature: number;
}

export interface AiChatbotSettings {
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  /** Chatbot-only API keys — never shared with article/text AI. */
  apiKeys?: Partial<Record<AiProvider, string>>;
}

export interface AiConsultationSettings {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  /** Consultation estimate-only API keys — separate from article/chatbot AI. */
  apiKeys?: Partial<Record<AiProvider, string>>;
  /** Optional extra instructions appended to the default estimate prompt. */
  customInstructions?: string;
}

export interface AiConfig {
  enabled: boolean;
  /** Currently active provider used for article/text AI. */
  provider: AiProvider;
  providers: Record<AiProvider, AiProviderConfig>;
  /** Image generation engine + model (separate from chat model). */
  image?: AiImageSettings;
  /** Site chatbot — separate provider + API keys. */
  chatbot?: AiChatbotSettings;
  /** Smart consultation estimate — separate provider + API keys. */
  consultation?: AiConsultationSettings;
}

export type AiImageEngine = 'imagen' | 'gemini-native' | 'openai';

export interface AiImageSettings {
  engine: AiImageEngine;
  model: string;
  /** Dedicated Google key for Imagen / Gemini Image (separate from chat). */
  googleApiKey?: string;
  /** Dedicated OpenAI key for DALL·E (separate from chat). */
  openaiApiKey?: string;
  baseUrl?: string;
}

export const AI_IMAGE_ENGINES: { id: AiImageEngine; label: string; hint: string }[] = [
  {
    id: 'imagen',
    label: 'Google Imagen',
    hint: 'پیشنهادی — imagen-3.0-generate-002 با کلید Google AI Studio',
  },
  {
    id: 'gemini-native',
    label: 'Gemini Native Image',
    hint: 'Nano Banana — gemini-2.5-flash-image و مشابه',
  },
  {
    id: 'openai',
    label: 'OpenAI DALL·E',
    hint: 'نیاز به کلید OpenAI جداگانه',
  },
];

export const AI_IMAGE_MODELS: Record<AiImageEngine, string[]> = {
  imagen: ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001', 'imagen-4.0-generate-001'],
  'gemini-native': ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image'],
  openai: ['dall-e-3', 'dall-e-2'],
};

export const DEFAULT_IMAGE_SETTINGS: AiImageSettings = {
  engine: 'imagen',
  model: 'imagen-3.0-generate-002',
};

/** Static metadata describing how each provider is configured and called. */
export interface AiProviderMeta {
  id: AiProvider;
  label: string;
  brand: string;
  apiStyle: AiApiStyle;
  defaultModel: string;
  defaultBaseUrl: string;
  models: string[];
  keyPlaceholder: string;
  /** Server env vars checked as a fallback key source. */
  envKeys: string[];
  hint: string;
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: 'openai',
    label: 'ChatGPT',
    brand: 'OpenAI · ChatGPT',
    apiStyle: 'openai',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
    keyPlaceholder: 'sk-...',
    envKeys: ['OPENAI_API_KEY'],
    hint: 'کلید را از platform.openai.com دریافت کنید.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    brand: 'Google · Gemini',
    apiStyle: 'gemini',
    defaultModel: 'gemini-flash-latest',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyPlaceholder: 'AIza... یا AQ....',
    envKeys: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    hint: 'کلید را از Google AI Studio (aistudio.google.com) دریافت کنید.',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    brand: 'Anthropic · Claude',
    apiStyle: 'anthropic',
    defaultModel: 'claude-3-5-haiku-latest',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest'],
    keyPlaceholder: 'sk-ant-...',
    envKeys: ['ANTHROPIC_API_KEY'],
    hint: 'کلید را از console.anthropic.com دریافت کنید.',
  },
  {
    id: 'custom',
    label: 'سفارشی (سازگار با OpenAI)',
    brand: 'Custom · OpenAI-compatible',
    apiStyle: 'openai',
    defaultModel: '',
    defaultBaseUrl: '',
    models: [],
    keyPlaceholder: 'کلید سرویس شما',
    envKeys: ['AI_CUSTOM_API_KEY'],
    hint: 'برای سرویس‌های سازگار با OpenAI (OpenRouter، LocalAI، Azure و …).',
  },
];

export function providerMeta(id: AiProvider): AiProviderMeta {
  return AI_PROVIDERS.find((p) => p.id === id) ?? AI_PROVIDERS[0];
}

export interface AiProviderAdminView {
  model: string;
  baseUrl: string;
  temperature: number;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  envFallback: boolean;
}

/** Safe view for admin UI — never includes the raw API key. */
export const DEFAULT_CHATBOT_AI_SETTINGS: AiChatbotSettings = {
  provider: 'gemini',
  model: 'gemini-flash-latest',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  temperature: 0.35,
  apiKeys: {},
};

export const DEFAULT_CONSULTATION_AI_SETTINGS: AiConsultationSettings = {
  enabled: true,
  provider: 'gemini',
  model: 'gemini-flash-latest',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  temperature: 0.25,
  apiKeys: {},
  customInstructions: '',
};

export interface AiConfigAdminView {
  enabled: boolean;
  provider: AiProvider;
  providers: Record<AiProvider, AiProviderAdminView>;
  /** Where the active provider's key would come from when article AI runs. */
  keySource: 'panel' | 'env' | 'none';
  image: AiImageSettings;
  imageKeys: {
    hasGoogleApiKey: boolean;
    googleApiKeyPreview: string | null;
    googleEnvFallback: boolean;
    hasOpenaiApiKey: boolean;
    openaiApiKeyPreview: string | null;
    openaiEnvFallback: boolean;
  };
  chatbot: AiChatbotSettings;
  chatbotKeys: {
    hasApiKey: boolean;
    apiKeyPreview: string | null;
    envFallback: boolean;
    keySource: 'panel' | 'env' | 'none';
  };
  consultation: AiConsultationSettings;
  consultationKeys: {
    hasApiKey: boolean;
    apiKeyPreview: string | null;
    envFallback: boolean;
    keySource: 'panel' | 'env' | 'none';
  };
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  messages: AiChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: 'text' | 'json';
}

function defaultProviderConfig(meta: AiProviderMeta): AiProviderConfig {
  return {
    model: meta.defaultModel,
    baseUrl: meta.defaultBaseUrl,
    temperature: 0.7,
  };
}

export function defaultProviders(): Record<AiProvider, AiProviderConfig> {
  return AI_PROVIDERS.reduce(
    (acc, meta) => {
      acc[meta.id] = defaultProviderConfig(meta);
      return acc;
    },
    {} as Record<AiProvider, AiProviderConfig>,
  );
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  enabled: true,
  provider: 'openai',
  providers: defaultProviders(),
  image: { ...DEFAULT_IMAGE_SETTINGS },
  chatbot: { ...DEFAULT_CHATBOT_AI_SETTINGS },
  consultation: { ...DEFAULT_CONSULTATION_AI_SETTINGS },
};
