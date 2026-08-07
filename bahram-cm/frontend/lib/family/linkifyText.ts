export type TextLinkPart =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s<>'")\]]+/gi;
const TRAILING_PUNCT_PATTERN = /[)\].,;:!?]+$/;

/** Split plain text into text + clickable URL segments (Telegram-style autolink). */
export function splitTextWithLinks(text: string): TextLinkPart[] {
  if (!text) return [];

  const parts: TextLinkPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const raw = match[0];

    if (start > cursor) {
      parts.push({ type: 'text', value: text.slice(cursor, start) });
    }

    const href = raw.replace(TRAILING_PUNCT_PATTERN, '');
    const trailing = raw.slice(href.length);

    if (href) {
      parts.push({ type: 'link', value: href, href });
    }
    if (trailing) {
      parts.push({ type: 'text', value: trailing });
    }

    cursor = start + raw.length;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', value: text.slice(cursor) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}
