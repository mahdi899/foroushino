export interface SitemapImageEntry {
  loc: string;
  title?: string | null;
  caption?: string | null;
}

export interface SitemapVideoEntry {
  content_loc?: string | null;
  player_loc?: string | null;
  thumbnail_loc?: string | null;
  title?: string | null;
  description?: string | null;
  duration?: number | null;
  publication_date?: string | null;
  family_friendly?: boolean;
  uploader?: string | null;
  live?: boolean;
}

export interface SitemapNewsEntry {
  publication_name: string;
  language: string;
  title: string;
  publication_date: string;
  keywords?: string | null;
}

export interface SitemapUrlEntry {
  loc: string;
  path?: string;
  lastmod: string;
  changefreq?: string;
  priority?: number;
  images?: SitemapImageEntry[];
  videos?: SitemapVideoEntry[];
  news?: SitemapNewsEntry;
}

export interface SitemapIndexEntry {
  id: string;
  section: string;
  page: number;
  loc: string;
  lastmod: string;
  url_count: number;
}

export interface SitemapChunkResponse {
  section: string;
  page: number;
  urls: SitemapUrlEntry[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function optionalTag(name: string, value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  return `    <${name}>${escapeXml(trimmed)}</${name}>`;
}

function buildImageBlock(img: SitemapImageEntry): string {
  const lines = [
    '      <image:loc>'.concat(escapeXml(img.loc), '</image:loc>'),
    img.title?.trim() ? `      <image:title>${escapeXml(img.title.trim())}</image:title>` : '',
    img.caption?.trim() ? `      <image:caption>${escapeXml(img.caption.trim())}</image:caption>` : '',
  ].filter(Boolean);

  return ['    <image:image>', ...lines, '    </image:image>'].join('\n');
}

function buildVideoBlock(video: SitemapVideoEntry): string {
  const lines = [
    video.thumbnail_loc?.trim() ? `      <video:thumbnail_loc>${escapeXml(video.thumbnail_loc.trim())}</video:thumbnail_loc>` : '',
    video.title?.trim() ? `      <video:title>${escapeXml(video.title.trim())}</video:title>` : '',
    video.description?.trim() ? `      <video:description>${escapeXml(video.description.trim())}</video:description>` : '',
    video.content_loc?.trim() ? `      <video:content_loc>${escapeXml(video.content_loc.trim())}</video:content_loc>` : '',
    video.player_loc?.trim() ? `      <video:player_loc>${escapeXml(video.player_loc.trim())}</video:player_loc>` : '',
    video.duration != null ? `      <video:duration>${Math.round(video.duration)}</video:duration>` : '',
    video.publication_date?.trim() ? `      <video:publication_date>${escapeXml(video.publication_date.trim())}</video:publication_date>` : '',
    video.family_friendly != null ? `      <video:family_friendly>${video.family_friendly ? 'yes' : 'no'}</video:family_friendly>` : '',
    video.uploader?.trim() ? `      <video:uploader>${escapeXml(video.uploader.trim())}</video:uploader>` : '',
    video.live != null ? `      <video:live>${video.live ? 'yes' : 'no'}</video:live>` : '',
  ].filter(Boolean);

  return ['    <video:video>', ...lines, '    </video:video>'].join('\n');
}

function buildNewsBlock(news: SitemapNewsEntry): string {
  const keywords = news.keywords?.trim()
    ? `\n      <news:keywords>${escapeXml(news.keywords.trim())}</news:keywords>`
    : '';

  return [
    '    <news:news>',
    '      <news:publication>',
    `        <news:name>${escapeXml(news.publication_name)}</news:name>`,
    `        <news:language>${escapeXml(news.language)}</news:language>`,
    '      </news:publication>',
    `      <news:publication_date>${escapeXml(news.publication_date)}</news:publication_date>`,
    `      <news:title>${escapeXml(news.title)}</news:title>${keywords}`,
    '    </news:news>',
  ].join('\n');
}

export function buildSitemapIndexXml(entries: SitemapIndexEntry[]): string {
  const items = entries
    .map(
      (entry) =>
        `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </sitemap>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
}

/** Full urlset with image, video, and Google News extensions (Rank Math style). */
export function buildUrlsetXml(urls: SitemapUrlEntry[]): string {
  const urlNodes = urls.map((url) => {
    const blocks = [
      '  <url>',
      `    <loc>${escapeXml(url.loc)}</loc>`,
      url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>` : '',
      url.changefreq ? `    <changefreq>${escapeXml(url.changefreq)}</changefreq>` : '',
      url.priority != null ? `    <priority>${url.priority.toFixed(1)}</priority>` : '',
      ...(url.news ? [buildNewsBlock(url.news)] : []),
      ...(url.images ?? []).map(buildImageBlock),
      ...(url.videos ?? []).map(buildVideoBlock),
      '  </url>',
    ].filter(Boolean);

    return blocks.join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urlNodes.join('\n')}\n</urlset>\n`;
}

/** Google News-only sitemap (articles from the last 48 hours). */
export function buildNewsUrlsetXml(urls: SitemapUrlEntry[]): string {
  const urlNodes = urls
    .filter((url) => url.news)
    .map((url) => {
      return ['  <url>', `    <loc>${escapeXml(url.loc)}</loc>`, buildNewsBlock(url.news!), '  </url>'].join('\n');
    });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urlNodes.join('\n')}\n</urlset>\n`;
}

export function parseSitemapFileName(file: string): { section: string; page: number } | null {
  const match = file.match(/^([a-z]+)-(\d+)\.xml$/i);
  if (!match) return null;
  return { section: match[1], page: Number(match[2]) };
}

export const SITEMAP_SECTION_LABELS: Record<string, string> = {
  articles: 'مقالات (تصویر + ویدیو + News)',
  news: 'Google News (۴۸ ساعت اخیر)',
  categories: 'دسته‌بندی مجله',
  pages: 'برگه‌ها',
  landings: 'لندینگ‌ها',
  services: 'خدمات',
  cases: 'نمونه‌کارها',
  doctors: 'پزشکان',
};
