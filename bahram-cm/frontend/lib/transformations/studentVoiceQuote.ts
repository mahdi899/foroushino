import { site } from '@/content/site';

const quoteBySlug = Object.fromEntries(
  site.transformations.map((item) => [item.slug, item.quote]),
) as Record<string, string>;

/** نقل‌قول به زبان خود دانشجو — نه خلاصهٔ بازاریابی. */
export function studentVoiceQuote(item: {
  slug: string;
  summary: string;
  body: string;
}): string {
  const fromSite = quoteBySlug[item.slug];
  if (fromSite) return fromSite;

  const fromBody = item.body.match(/>\s*[«"]([^»"]+)[»"]/);
  if (fromBody?.[1]) return fromBody[1].trim();

  return item.summary;
}
