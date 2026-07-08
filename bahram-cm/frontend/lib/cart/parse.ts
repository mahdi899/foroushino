/** Shared cart slug parsing for cookie values. */
export function parseCartSlugs(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
  } catch {
    return raw
      .split(",")
      .map((slug) => slug.trim())
      .filter(Boolean);
  }
}

export function serializeCartSlugs(slugs: string[]): string {
  return JSON.stringify([...new Set(slugs)]);
}
