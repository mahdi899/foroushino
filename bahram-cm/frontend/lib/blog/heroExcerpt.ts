function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractParagraphs(html: string): string[] {
  const paragraphs: string[] = [];
  const pattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match = pattern.exec(html);

  while (match) {
    const text = stripHtml(match[1]);
    if (text.length >= 48) paragraphs.push(text);
    match = pattern.exec(html);
  }

  return paragraphs;
}

function pickStableIndex(seed: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

/** Hero excerpt: use admin summary, else a stable pseudo-random paragraph from body. */
export function resolveArticleHeroExcerpt(
  excerpt: string | null | undefined,
  content: string,
  slug: string,
): string | null {
  const trimmedExcerpt = excerpt?.trim();
  if (trimmedExcerpt) return trimmedExcerpt;

  const paragraphs = extractParagraphs(content);
  if (paragraphs.length > 0) {
    return paragraphs[pickStableIndex(slug, paragraphs.length)];
  }

  const fallback = stripHtml(content).slice(0, 280).trim();
  return fallback || null;
}
