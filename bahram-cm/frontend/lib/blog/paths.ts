/** Canonical public blog index (Bahram academy — not `/blog`). */
export const BLOG_INDEX_PATH = '/insights';

/** Public URL for a published article. */
export function articlePublicPath(slug: string): string {
  const trimmed = slug.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return BLOG_INDEX_PATH;
  return `${BLOG_INDEX_PATH}/${encodeURIComponent(trimmed)}`;
}

/** Categories are editorial metadata only — list lives on the blog index. */
export function blogCategoryPath(_slug: string): string {
  return BLOG_INDEX_PATH;
}
