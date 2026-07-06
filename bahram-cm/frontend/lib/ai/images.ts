'use server';

import { getResolvedImageSettings } from './settings';
import type { AiImageEngine } from './types';

export type AiImagePurpose = 'cover' | 'inline';

export type AiImageResult =
  | { ok: true; url: string; provider: string; model: string }
  | { ok: false; error: string };

function bahramImagePrompt(prompt: string, purpose: AiImagePurpose): string {
  const base =
    'Professional personal-brand and education photography, warm cinematic lighting, premium modern aesthetic, no text overlay, no watermark, realistic, high quality.';
  const framing =
    purpose === 'cover'
      ? 'Wide 16:9 hero composition suitable for blog cover.'
      : 'Editorial in-article photo, informative and trustworthy.';
  return `${base} ${framing} Subject: ${prompt.trim()}`;
}

function parseApiError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) return msg;
  } catch {
    /* ignore */
  }
  return raw.trim().slice(0, 280) || `خطای HTTP ${status}`;
}

function extractBase64FromPrediction(prediction: Record<string, unknown>): { data: string; mime: string } | null {
  const direct = prediction.bytesBase64Encoded;
  if (typeof direct === 'string' && direct) {
    return { data: direct, mime: (prediction.mimeType as string) || 'image/png' };
  }
  const image = prediction.image as { bytesBase64Encoded?: string; mimeType?: string } | undefined;
  if (image?.bytesBase64Encoded) {
    return { data: image.bytesBase64Encoded, mime: image.mimeType || 'image/png' };
  }
  return null;
}

/** Google Imagen via :predict (imagen-3.0-generate-002, etc.) */
async function generateImagenImage(
  creds: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
  purpose: AiImagePurpose,
): Promise<{ ok: true; bytes: Buffer; mime: string } | { ok: false; error: string }> {
  const base = creds.baseUrl.replace(/\/+$/, '');
  const model = creds.model.trim() || 'imagen-3.0-generate-002';
  const endpoint = `${base}/models/${model}:predict`;
  const aspectRatio = purpose === 'cover' ? '16:9' : '1:1';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': creds.apiKey,
    },
    body: JSON.stringify({
      instances: [{ prompt: bahramImagePrompt(prompt, purpose) }],
      parameters: {
        sampleCount: 1,
        aspectRatio,
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: `${model}: ${parseApiError(raw, res.status)}` };
  }

  let json: { predictions?: Record<string, unknown>[] };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return { ok: false, error: `${model}: پاسخ JSON نامعتبر بود.` };
  }

  const prediction = json.predictions?.[0];
  if (!prediction) {
    return {
      ok: false,
      error: `${model}: تصویری در پاسخ نبود — Imagen billing و سهمیه Google AI Studio را بررسی کنید.`,
    };
  }

  const encoded = extractBase64FromPrediction(prediction);
  if (!encoded) {
    return { ok: false, error: `${model}: داده تصویر base64 در پاسخ یافت نشد.` };
  }

  return {
    ok: true,
    bytes: Buffer.from(encoded.data, 'base64'),
    mime: encoded.mime,
  };
}

/** Gemini Native Image (Nano Banana) via generateContent */
async function generateGeminiNativeImage(
  creds: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
  purpose: AiImagePurpose,
): Promise<{ ok: true; bytes: Buffer; mime: string } | { ok: false; error: string }> {
  const base = creds.baseUrl.replace(/\/+$/, '');
  const model = creds.model.trim() || 'gemini-2.5-flash-image';
  const endpoint = `${base}/models/${model}:generateContent`;
  const aspectRatio = purpose === 'cover' ? '16:9' : '1:1';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': creds.apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: bahramImagePrompt(prompt, purpose) }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    return { ok: false, error: `${model}: ${parseApiError(raw, res.status)}` };
  }

  let json: {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    promptFeedback?: { blockReason?: string };
  };
  try {
    json = JSON.parse(raw) as typeof json;
  } catch {
    return { ok: false, error: `${model}: پاسخ JSON نامعتبر بود.` };
  }

  if (json.promptFeedback?.blockReason) {
    return { ok: false, error: `${model}: درخواست مسدود شد (${json.promptFeedback.blockReason}).` };
  }

  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const inline = part?.inlineData;
  if (!inline?.data) {
    return { ok: false, error: `${model}: تصویری در پاسخ نبود.` };
  }

  return {
    ok: true,
    bytes: Buffer.from(inline.data, 'base64'),
    mime: inline.mimeType || 'image/png',
  };
}

async function generateOpenAiImage(
  creds: { apiKey: string; baseUrl: string; model: string },
  prompt: string,
  purpose: AiImagePurpose,
): Promise<{ ok: true; bytes: Buffer; mime: string } | { ok: false; error: string }> {
  const model = creds.model.trim() || 'dall-e-3';
  const endpoint = `${creds.baseUrl.replace(/\/+$/, '')}/images/generations`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt: bahramImagePrompt(prompt, purpose),
      n: 1,
      size: purpose === 'cover' ? '1792x1024' : '1024x1024',
      response_format: 'b64_json',
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    return { ok: false, error: `${model}: ${parseApiError(raw, res.status)}` };
  }

  const json = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) return { ok: false, error: `${model}: پاسخ تصویر OpenAI خالی بود.` };

  return { ok: true, bytes: Buffer.from(b64, 'base64'), mime: 'image/png' };
}

async function persistGeneratedImage(
  bytes: Buffer,
  mime: string,
  alt: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { getToken } = await import('@/lib/auth/session');
  const token = await getToken();
  if (!token) {
    return { ok: false, error: 'برای ذخیره تصویر AI باید وارد پنل ادمین باشید.' };
  }

  const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
  const { SERVER_API_URL } = await import('@/lib/api/config');
  const { persistMediaUrl, resolveMediaUrl } = await import('@/lib/mediaUrl');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), `ai-${Date.now()}.${ext}`);
  form.append('alt_fa', alt);

  const res = await fetch(`${SERVER_API_URL}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) {
    const raw = await res.text();
    if (res.status === 403) {
      return {
        ok: false,
        error: 'دسترسی آپلود رسانه ندارید (نیاز به media.write).',
      };
    }
    return { ok: false, error: `آپلود تصویر در گالری ناموفق (${res.status}): ${raw.slice(0, 180)}` };
  }

  const json = (await res.json()) as { data: { url: string } };
  const stored = persistMediaUrl(json.data.url) || resolveMediaUrl(json.data.url);
  if (!stored) return { ok: false, error: 'آدرس تصویر پس از آپلود دریافت نشد.' };

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/admin/gallery');
  return { ok: true, url: stored };
}

function engineLabel(engine: AiImageEngine): string {
  if (engine === 'imagen') return 'Imagen';
  if (engine === 'openai') return 'OpenAI';
  return 'Gemini Image';
}

async function generateImageBytes(
  settings: import('./settings').ResolvedImageSettings,
  prompt: string,
  purpose: AiImagePurpose,
): Promise<{ ok: true; bytes: Buffer; mime: string } | { ok: false; error: string }> {
  if (settings.engine === 'openai') {
    if (!settings.openaiApiKey) {
      return { ok: false, error: 'کلید OpenAI برای تولید تصویر (DALL·E) در تنظیمات AI لازم است.' };
    }
    return generateOpenAiImage(
      { apiKey: settings.openaiApiKey, baseUrl: settings.openaiBaseUrl, model: settings.model },
      prompt,
      purpose,
    );
  }
  if (settings.engine === 'imagen' || settings.model.startsWith('imagen-')) {
    if (!settings.apiKey) {
      return { ok: false, error: 'کلید Google AI (Gemini/Imagen) در تنظیمات AI لازم است.' };
    }
    return generateImagenImage(
      { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model },
      prompt,
      purpose,
    );
  }
  if (!settings.apiKey) {
    return { ok: false, error: 'کلید Google AI برای تولید تصویر در تنظیمات AI لازم است.' };
  }
  return generateGeminiNativeImage(
    { apiKey: settings.apiKey, baseUrl: settings.baseUrl, model: settings.model },
    prompt,
    purpose,
  );
}

/** Generate with explicit runtime settings (for tests / drafts). */
export async function generateAiImageWithSettings(
  settings: import('./settings').ResolvedImageSettings,
  input: { prompt: string; purpose?: AiImagePurpose; alt?: string },
): Promise<AiImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) return { ok: false, error: 'توضیح تصویر را وارد کنید.' };

  const purpose = input.purpose ?? 'inline';
  const generated = await generateImageBytes(settings, prompt, purpose);

  if (!generated.ok) {
    return {
      ok: false,
      error: `تولید تصویر با ${engineLabel(settings.engine)} ناموفق بود. ${generated.error}`,
    };
  }

  const persisted = await persistGeneratedImage(generated.bytes, generated.mime, input.alt ?? prompt);
  if (!persisted.ok) return { ok: false, error: persisted.error };

  return {
    ok: true,
    url: persisted.url,
    provider: settings.engine,
    model: settings.model,
  };
}

/** Generates a dental-clinic image with AI and stores it in the site media gallery. */
export async function generateAiImage(input: {
  prompt: string;
  purpose?: AiImagePurpose;
  alt?: string;
}): Promise<AiImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) return { ok: false, error: 'توضیح تصویر را وارد کنید.' };

  const settings = await getResolvedImageSettings();
  return generateAiImageWithSettings(settings, input);
}
