/** Normalize dynamic route / API slug params (handles encoded Unicode safely). */
export function normalizeArticleSlugParam(raw: string): string {
  let slug = raw.trim();
  if (!slug) return slug;

  try {
    for (let i = 0; i < 2; i += 1) {
      if (!/%[0-9A-Fa-f]{2}/.test(slug)) break;
      const decoded = decodeURIComponent(slug);
      if (decoded === slug) break;
      slug = decoded;
    }
  } catch {
    // keep raw slug when decoding fails
  }

  return slug;
}
