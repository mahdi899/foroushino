import 'package:bahram_family_manager/models/models.dart';

/// Offline fallback when provider catalog API is unavailable.
const kFallbackAiProviders = <AiProviderMeta>[
  AiProviderMeta(
    id: 'openai',
    label: 'ChatGPT (OpenAI)',
    apiStyle: 'openai',
    defaultModel: 'gpt-4o-mini',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
    keyHint: 'sk-...',
    hint: 'کلید را از platform.openai.com دریافت کنید.',
  ),
  AiProviderMeta(
    id: 'gemini',
    label: 'Gemini (Google)',
    apiStyle: 'gemini',
    defaultModel: 'gemini-2.0-flash',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyHint: 'AIza...',
    hint: 'کلید را از Google AI Studio بگیرید.',
  ),
  AiProviderMeta(
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    apiStyle: 'anthropic',
    defaultModel: 'claude-3-5-haiku-latest',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest'],
    keyHint: 'sk-ant-...',
    hint: 'کلید را از console.anthropic.com دریافت کنید.',
  ),
  AiProviderMeta(
    id: 'custom',
    label: 'سفارشی (OpenAI-compatible)',
    apiStyle: 'openai',
    defaultModel: '',
    defaultBaseUrl: '',
    models: [],
    keyHint: 'کلید سرویس',
    hint: 'برای OpenRouter، LocalAI و سرویس‌های سازگار با OpenAI.',
  ),
];

AiProviderMeta? findAiProvider(List<AiProviderMeta> providers, String id) {
  for (final provider in providers) {
    if (provider.id == id) return provider;
  }
  return null;
}
