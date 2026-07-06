import { providerMeta } from './types';

export interface GeminiModelInfo {
  /** Short id e.g. gemini-2.0-flash */
  id: string;
  /** Full resource name e.g. models/gemini-2.0-flash */
  name: string;
  displayName: string;
  description: string;
  methods: string[];
  kind: 'chat' | 'image' | 'other';
}

function classifyGeminiModel(id: string, methods: string[]): GeminiModelInfo['kind'] {
  const lower = id.toLowerCase();
  if (lower.includes('imagen') || lower.includes('flash-image') || lower.includes('image-generation')) {
    return 'image';
  }
  if (methods.includes('predict') && !methods.includes('generateContent')) {
    return 'image';
  }
  if (methods.includes('generateContent')) {
    return 'chat';
  }
  return 'other';
}

function parseModelEntry(raw: {
  name?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}): GeminiModelInfo | null {
  const name = raw.name?.trim();
  if (!name) return null;
  const id = name.replace(/^models\//, '');
  const methods = raw.supportedGenerationMethods ?? [];
  return {
    id,
    name,
    displayName: raw.displayName?.trim() || id,
    description: raw.description?.trim() || '',
    methods,
    kind: classifyGeminiModel(id, methods),
  };
}

/** Lists models available for the given Google AI Studio / Gemini API key. */
export async function listGeminiModels(
  apiKey: string,
  baseUrl?: string,
): Promise<{ ok: true; models: GeminiModelInfo[] } | { ok: false; error: string }> {
  const key = apiKey.trim();
  if (!key) {
    return { ok: false, error: 'کلید Google AI (Gemini) تنظیم نشده است.' };
  }

  const base = (baseUrl?.trim() || providerMeta('gemini').defaultBaseUrl).replace(/\/+$/, '');
  const models: GeminiModelInfo[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const url = new URL(`${base}/models`);
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString(), {
        headers: { 'X-goog-api-key': key },
        cache: 'no-store',
      });

      const raw = await res.text();
      if (!res.ok) {
        let msg = raw.slice(0, 240);
        try {
          const parsed = JSON.parse(raw) as { error?: { message?: string } };
          if (parsed.error?.message) msg = parsed.error.message;
        } catch {
          /* ignore */
        }
        return { ok: false, error: `لیست مدل‌ها ناموفق (${res.status}): ${msg}` };
      }

      const json = JSON.parse(raw) as {
        models?: Parameters<typeof parseModelEntry>[0][];
        nextPageToken?: string;
      };

      for (const entry of json.models ?? []) {
        const parsed = parseModelEntry(entry);
        if (parsed) models.push(parsed);
      }

      pageToken = json.nextPageToken;
    } while (pageToken);

    models.sort((a, b) => a.id.localeCompare(b.id, 'en'));
    return { ok: true, models };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'خطا در دریافت لیست مدل‌ها' };
  }
}

export function filterGeminiModels(
  models: GeminiModelInfo[],
  filter: 'chat' | 'image' | 'all',
): GeminiModelInfo[] {
  if (filter === 'all') return models;
  return models.filter((m) => m.kind === filter);
}
