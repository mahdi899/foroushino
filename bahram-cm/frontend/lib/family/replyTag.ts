/**
 * Reply name-chip encoding for family comments.
 * Stored as ⟦Name⟧body so Persian names render as a chip, not @mentions.
 */

const REPLY_TAG_RE = /^⟦([^⟧]{1,80})⟧\s*/u;
/** Legacy Instagram-style @mention at the start of a reply. */
const LEGACY_AT_RE =
  /^@([\u0600-\u06FFa-zA-Z0-9_\u200c]+(?:\s+[\u0600-\u06FFa-zA-Z0-9_\u200c]+){0,4})\s*/u;

export function parseReplyBody(text: string): { tag: string | null; body: string } {
  const tagged = text.match(REPLY_TAG_RE);
  if (tagged) {
    return { tag: tagged[1]!.trim(), body: text.slice(tagged[0].length) };
  }
  const legacy = text.match(LEGACY_AT_RE);
  if (legacy) {
    return { tag: legacy[1]!.trim(), body: text.slice(legacy[0].length) };
  }
  return { tag: null, body: text };
}

export function encodeReplyBody(tagName: string | null | undefined, body: string): string {
  const trimmed = body.trim();
  const tag = tagName?.trim();
  if (!tag) return trimmed;
  return `⟦${tag}⟧${trimmed}`;
}

export function stripReplyTagPrefix(text: string): string {
  return parseReplyBody(text).body;
}
