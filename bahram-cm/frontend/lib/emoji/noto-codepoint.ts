/** Grapheme → Noto CDN / asset slug (lowercase hex, `_` between code points). */
export function emojiToCodepointSlug(emoji: string): string {
  const parts: string[] = [];
  for (let i = 0; i < emoji.length; ) {
    const cp = emoji.codePointAt(i)!;
    parts.push(cp.toString(16));
    i += cp > 0xffff ? 2 : 1;
  }
  return parts.join('_');
}

/** Try common FE0F / skin-tone variants when resolving bundled assets. */
export function notoSlugVariants(slug: string): string[] {
  const out = new Set<string>([slug]);
  if (slug.endsWith('_fe0f')) out.add(slug.slice(0, -5));
  out.add(slug.replace(/_fe0f/g, ''));
  out.add(slug.replace(/_fe0f_/, '_'));
  return [...out].filter(Boolean);
}
