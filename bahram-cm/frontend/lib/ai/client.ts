'use server';

import { getResolvedAiRuntime, type ResolvedAiRuntime } from './settings';
import { providerMeta } from './types';
import type { AiChatMessage, AiChatOptions, AiErrorDetail } from './types';

export type AiChatResult =
  | {
      ok: true;
      content: string;
      model: string;
      provider: string;
      keySource: 'panel' | 'env' | 'none';
    }
  | {
      ok: false;
      error: string;
      reason: 'disabled' | 'missing_key' | 'provider' | 'request_failed';
      detail?: AiErrorDetail;
    };

type ProviderFail = { ok: false; error: string; detail: AiErrorDetail };
type ProviderOk = { ok: true; content: string };

function trimUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function baseDetail(runtime: ResolvedAiRuntime, model: string, endpoint: string): Omit<AiErrorDetail, 'summary' | 'hints'> {
  return {
    provider: providerMeta(runtime.provider).label,
    model,
    endpoint,
    keySource: runtime.keySource,
  };
}

function fail(
  runtime: ResolvedAiRuntime,
  model: string,
  endpoint: string,
  summary: string,
  extra: Partial<AiErrorDetail> = {},
): ProviderFail {
  return {
    ok: false,
    error: summary,
    detail: {
      summary,
      hints: extra.hints ?? [],
      ...baseDetail(runtime, model, endpoint),
      ...extra,
    },
  };
}

function parseApiError(raw: string, status: number): { summary: string; hints: string[]; rawResponse: string } {
  const hints: string[] = [];
  let summary = `خطای HTTP ${status}`;

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; status?: string; code?: number; type?: string };
      message?: string;
    };
    const msg = parsed.error?.message ?? parsed.message ?? '';
    const code = parsed.error?.status ?? parsed.error?.type ?? '';

    if (msg) summary = msg;
    if (code) hints.push(`کد خطا: ${code}`);

    if (msg.includes('API key') || status === 401 || status === 403 || code === 'UNAUTHENTICATED') {
      summary = 'کلید API نامعتبر یا منقضی شده است.';
      hints.push('کلید را از پنل Google AI Studio / OpenAI دوباره کپی کنید.');
      hints.push('پس از وارد کردن کلید، دکمه «ذخیره» را بزنید.');
    }
    if (msg.includes('not found') || code === 'NOT_FOUND') {
      summary = 'مدل پیدا نشد — نام مدل را بررسی کنید.';
      hints.push('برای Gemini از gemini-flash-latest استفاده کنید.');
    }
    if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      summary = 'سهمیه API تمام شده یا محدودیت rate limit.';
      hints.push('چند دقیقه صبر کنید یا پلن API را بررسی کنید.');
    }
  } catch {
    if (raw.trim()) summary = raw.slice(0, 300);
  }

  return { summary, hints, rawResponse: raw.slice(0, 4000) };
}

async function callOpenAiCompatible(
  runtime: ResolvedAiRuntime,
  apiKey: string,
  model: string,
  temperature: number,
  options: AiChatOptions,
): Promise<ProviderOk | ProviderFail> {
  const endpoint = `${trimUrl(runtime.active.baseUrl)}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: options.messages,
      ...(options.responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    const parsed = parseApiError(raw, res.status);
    return fail(runtime, model, endpoint, parsed.summary, {
      statusCode: res.status,
      hints: parsed.hints,
      rawResponse: parsed.rawResponse,
    });
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return fail(runtime, model, endpoint, 'پاسخی از API دریافت نشد.', {
      statusCode: res.status,
      hints: ['پاسخ خالی بود — مدل یا درخواست را بررسی کنید.'],
    });
  }
  return { ok: true, content };
}

async function callAnthropic(
  runtime: ResolvedAiRuntime,
  apiKey: string,
  model: string,
  temperature: number,
  options: AiChatOptions,
): Promise<ProviderOk | ProviderFail> {
  const endpoint = `${trimUrl(runtime.active.baseUrl)}/messages`;
  const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const messages = options.messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature,
      ...(system ? { system } : {}),
      messages,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    const parsed = parseApiError(raw, res.status);
    return fail(runtime, model, endpoint, parsed.summary, {
      statusCode: res.status,
      hints: parsed.hints,
      rawResponse: parsed.rawResponse,
    });
  }

  const json = (await res.json()) as { content?: { text?: string }[] };
  const content = json.content?.map((c) => c.text ?? '').join('').trim();
  if (!content) {
    return fail(runtime, model, endpoint, 'پاسخی از Claude دریافت نشد.', { statusCode: res.status });
  }
  return { ok: true, content };
}

function buildGeminiContents(messages: AiChatMessage[]) {
  const turns = messages.filter((m) => m.role !== 'system');
  if (turns.length === 0) return [{ parts: [{ text: 'Hello' }] }];
  if (turns.length === 1 && turns[0].role === 'user') {
    return [{ parts: [{ text: turns[0].content }] }];
  }
  return turns.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

async function callGemini(
  runtime: ResolvedAiRuntime,
  apiKey: string,
  model: string,
  temperature: number,
  options: AiChatOptions,
): Promise<ProviderOk | ProviderFail> {
  const endpoint = `${trimUrl(runtime.active.baseUrl)}/models/${encodeURIComponent(model)}:generateContent`;
  const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = buildGeminiContents(options.messages);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents,
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: {
        temperature,
        ...(options.responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    const parsed = parseApiError(raw, res.status);
    return fail(runtime, model, endpoint, parsed.summary, {
      statusCode: res.status,
      hints: [
        ...parsed.hints,
        'Base URL باید https://generativelanguage.googleapis.com/v1beta باشد.',
        'مدل پیشنهادی: gemini-flash-latest',
      ],
      rawResponse: parsed.rawResponse,
    });
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    promptFeedback?: { blockReason?: string };
  };

  if (json.promptFeedback?.blockReason) {
    return fail(runtime, model, endpoint, `درخواست مسدود شد: ${json.promptFeedback.blockReason}`, {
      statusCode: res.status,
      hints: ['محتوای درخواست توسط فیلتر Gemini رد شده است.'],
      rawResponse: JSON.stringify(json.promptFeedback, null, 2),
    });
  }

  const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
  if (!content) {
    return fail(runtime, model, endpoint, 'پاسخی از Gemini دریافت نشد.', {
      statusCode: res.status,
      hints: ['پاسخ خالی — مدل یا کلید API را بررسی کنید.'],
      rawResponse: JSON.stringify(json, null, 2).slice(0, 4000),
    });
  }
  return { ok: true, content };
}

/** Run chat with an explicit runtime (used for testing unsaved draft config). */
export async function aiChatCompletionWithRuntime(
  runtime: ResolvedAiRuntime,
  options: AiChatOptions,
): Promise<AiChatResult> {
  if (!runtime.enabled) {
    return {
      ok: false,
      error: 'هوش مصنوعی غیرفعال است.',
      reason: 'disabled',
      detail: {
        summary: 'هوش مصنوعی در تنظیمات غیرفعال است.',
        provider: providerMeta(runtime.provider).label,
        model: runtime.active.model,
        endpoint: runtime.active.baseUrl,
        hints: ['گزینه «فعال‌سازی هوش مصنوعی» را روشن کنید.'],
      },
    };
  }

  const apiKey = runtime.active.apiKey;
  const model = options.model || runtime.active.model;
  const temperature = options.temperature ?? runtime.active.temperature;
  const endpoint = runtime.active.baseUrl;

  if (!apiKey) {
    return {
      ok: false,
      error: 'کلید API تنظیم نشده.',
      reason: 'missing_key',
      detail: {
        summary: 'کلید API وارد نشده یا ذخیره نشده است.',
        provider: providerMeta(runtime.provider).label,
        model,
        endpoint,
        keySource: runtime.keySource,
        hints: [
          'کلید API را در فیلد مربوطه وارد کنید.',
          'می‌توانید بدون ذخیره، «تست اتصال» بزنید — کلید تایپ‌شده استفاده می‌شود.',
          'برای استفاده دائمی، «ذخیره» را بزنید.',
        ],
      },
    };
  }

  try {
    let result: ProviderOk | ProviderFail;
    if (runtime.apiStyle === 'anthropic') {
      result = await callAnthropic(runtime, apiKey, model, temperature, options);
    } else if (runtime.apiStyle === 'gemini') {
      result = await callGemini(runtime, apiKey, model, temperature, options);
    } else {
      result = await callOpenAiCompatible(runtime, apiKey, model, temperature, options);
    }

    if (!result.ok) {
      return { ok: false, error: result.error, reason: 'request_failed', detail: result.detail };
    }
    return { ok: true, content: result.content, model, provider: runtime.provider, keySource: runtime.keySource };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
    return {
      ok: false,
      error: 'خطا در ارتباط با سرویس هوش مصنوعی.',
      reason: 'request_failed',
      detail: {
        summary: msg,
        provider: providerMeta(runtime.provider).label,
        model,
        endpoint,
        hints: ['اتصال اینترنت سرور را بررسی کنید.', 'Base URL را چک کنید.'],
        rawResponse: msg,
      },
    };
  }
}

/** Shared multi-provider chat call for all site AI features. */
export async function aiChatCompletion(options: AiChatOptions): Promise<AiChatResult> {
  const runtime = await getResolvedAiRuntime();
  return aiChatCompletionWithRuntime(runtime, options);
}

export type { AiChatMessage, AiErrorDetail } from './types';
