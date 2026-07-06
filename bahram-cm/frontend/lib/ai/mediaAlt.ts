import { aiChatCompletion } from './client';

const BAD_ALT_PATTERNS = [
  /^img[-_]?\d+/i,
  /^image[-_]?\d+/i,
  /^photo[-_]?\d+/i,
  /^dsc[-_]?\d+/i,
  /^screenshot/i,
  /^snap/i,
  /\.(jpe?g|png|webp|gif|heic|avif)$/i,
  /^[a-f0-9]{8,}/i,
  /^[A-Za-z0-9_-]{20,}$/,
];

export function mediaAltNeedsFix(alt: string | null | undefined, filename?: string): boolean {
  const value = (alt ?? filename ?? '').trim();
  if (!value || value.length < 4) return true;
  if (value.length > 100 && !value.includes(' ')) return true;
  return BAD_ALT_PATTERNS.some((pattern) => pattern.test(value));
}

/** Readable alt from filename when AI is unavailable. */
export function filenameToFallbackAlt(filename: string, title?: string): string {
  const fromTitle = title?.trim();
  if (fromTitle && !mediaAltNeedsFix(fromTitle)) return fromTitle.slice(0, 255);

  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (base && !mediaAltNeedsFix(base)) return base.slice(0, 255);
  if (fromTitle) return fromTitle.slice(0, 255);
  return (base || filename || 'تصویر آپلود شده').slice(0, 255);
}

export async function suggestMediaAltWithAi(
  filename: string,
  mime?: string,
): Promise<{ ok: true; alt: string } | { ok: false; error: string }> {
  const ai = await aiChatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You write concise Persian (fa) alt text for Bahram Rostami academy website images. SEO-friendly, descriptive, natural, no quotes. Return JSON only: {"alt":"..."}',
      },
      {
        role: 'user',
        content: `Filename: ${filename}\nMIME: ${mime ?? 'image/jpeg'}\nWrite alt text in Persian for this personal-brand / education website image.`,
      },
    ],
    temperature: 0.4,
  });

  if (!ai.ok) {
    return { ok: false, error: ai.error };
  }

  try {
    const parsed = JSON.parse(ai.content) as { alt?: string };
    const alt = parsed.alt?.trim();
    if (!alt || alt.length < 4) {
      return { ok: false, error: 'پاسخ AI برای alt نامعتبر بود.' };
    }
    return { ok: true, alt: alt.slice(0, 255) };
  } catch {
    return { ok: false, error: 'خواندن پاسخ AI ناموفق بود.' };
  }
}
