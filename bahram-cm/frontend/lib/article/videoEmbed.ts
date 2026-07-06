export type VideoSource = 'youtube' | 'aparat' | 'direct';

export interface ArticleVideoAttrs {
  youtube?: string | null;
  aparat?: string | null;
  direct?: string | null;
  active?: VideoSource | null;
}

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const APARAT_RE = /aparat\.com\/(?:v\/|video\/video\/embed\/videohash\/)([a-zA-Z0-9]+)/i;
const DIRECT_VIDEO_RE = /\.(mp4|webm|ogg|mov)(\?|$)/i;

export function parseYoutubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  return value.match(YOUTUBE_RE)?.[1] ?? null;
}

export function parseAparatHash(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9]+$/.test(value) && !value.includes('.')) return value;
  return value.match(APARAT_RE)?.[1] ?? null;
}

export function normalizeDirectVideoUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (DIRECT_VIDEO_RE.test(value) || value.startsWith('/')) return value;
  try {
    const url = new URL(value);
    if (DIRECT_VIDEO_RE.test(url.pathname)) return value;
  } catch {
    return null;
  }
  return null;
}

export function defaultVideoSource(attrs: ArticleVideoAttrs): VideoSource {
  if (attrs.youtube) return 'youtube';
  if (attrs.aparat) return 'aparat';
  if (attrs.direct) return 'direct';
  return 'youtube';
}

export function resolveActiveSource(attrs: ArticleVideoAttrs): VideoSource {
  const preferred = attrs.active ?? defaultVideoSource(attrs);
  if (preferred === 'youtube' && attrs.youtube) return 'youtube';
  if (preferred === 'aparat' && attrs.aparat) return 'aparat';
  if (preferred === 'direct' && attrs.direct) return 'direct';
  return defaultVideoSource(attrs);
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function aparatEmbedUrl(hash: string): string {
  return `https://www.aparat.com/video/video/embed/videohash/${hash}/vt/frame`;
}

/** Display URLs for the admin edit form (stored attrs are ids/hashes). */
export function videoAttrsToFormValues(attrs: ArticleVideoAttrs): {
  youtube: string;
  aparat: string;
  direct: string;
} {
  return {
    youtube: attrs.youtube ? `https://www.youtube.com/watch?v=${attrs.youtube}` : '',
    aparat: attrs.aparat ? `https://www.aparat.com/v/${attrs.aparat}` : '',
    direct: attrs.direct ?? '',
  };
}

export function hasVideoSwitch(attrs: ArticleVideoAttrs): boolean {
  return Boolean(attrs.youtube && attrs.aparat);
}

export function normalizeVideoInput(input: {
  youtube?: string;
  aparat?: string;
  direct?: string;
}): { youtube: string; aparat: string; direct: string; error?: string } {
  const youtube = parseYoutubeId(input.youtube ?? '') ?? '';
  const aparat = parseAparatHash(input.aparat ?? '') ?? '';
  const direct = normalizeDirectVideoUrl(input.direct ?? '') ?? '';

  if (!youtube && !aparat && !direct) {
    return {
      youtube: '',
      aparat: '',
      direct: '',
      error: 'حداقل یک لینک معتبر (YouTube، آپارات یا فایل ویدیو) وارد کنید.',
    };
  }

  if (input.youtube?.trim() && !youtube) {
    return { youtube, aparat, direct, error: 'لینک YouTube نامعتبر است.' };
  }
  if (input.aparat?.trim() && !aparat) {
    return { youtube, aparat, direct, error: 'لینک آپارات نامعتبر است.' };
  }
  if (input.direct?.trim() && !direct) {
    return { youtube, aparat, direct, error: 'لینک مستقیم ویدیو باید mp4، webm یا ogg باشد.' };
  }

  return { youtube, aparat, direct };
}

const VIDEO_TAG_RE = /<div\s[^>]*\bdata-atrin-video="true"[^>]*>\s*<\/div>/gi;

function readAttr(tag: string, name: string): string {
  return tag.match(new RegExp(`data-${name}="([^"]*)"`))?.[1]?.trim() ?? '';
}

export function parseVideoTag(tag: string): ArticleVideoAttrs {
  return {
    youtube: readAttr(tag, 'youtube') || null,
    aparat: readAttr(tag, 'aparat') || null,
    direct: readAttr(tag, 'direct') || null,
    active: (readAttr(tag, 'active') as VideoSource) || null,
  };
}

export type ArticleBodyPart =
  | { type: 'html'; content: string }
  | { type: 'video'; attrs: ArticleVideoAttrs };

/** Split stored article HTML into static blocks and interactive video embeds. */
export function splitArticleBodyHtml(html: string): ArticleBodyPart[] {
  if (!html.includes('data-atrin-video')) {
    return [{ type: 'html', content: html }];
  }

  const parts: ArticleBodyPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(VIDEO_TAG_RE.source, 'gi');

  while ((match = re.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'video', attrs: parseVideoTag(match[0]) });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    parts.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'html', content: html }];
}
