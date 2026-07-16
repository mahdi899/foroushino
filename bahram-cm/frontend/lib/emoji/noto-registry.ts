/**
 * Self-hosted Google Noto Emoji Animation (Lottie).
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import emojiRegex from 'emoji-regex';
import { emojiToCodepointSlug, notoSlugVariants } from '@/lib/emoji/noto-codepoint';
import { hasNotoLottieSlug } from '@/lib/emoji/noto-lottie';
import type { FamilyReactionType } from '@/lib/family/types';

export type NotoEmojiSlug = string;

/** Semantic slug → Noto `codepoint` path segment (for download script). */
export const NOTO_CODEPOINT_BY_SLUG: Record<string, string> = {
  smile: '1f60a',
  'slight-smile': '1f642',
  grin: '1f601',
  pray: '1f64f',
  heart: '2764',
  'thumbs-up': '1f44d',
  book: '1f4da',
  sparkles: '2728',
  'green-heart': '1f49a',
  star: '2b50',
  wave: '1f44b',
  speech: '1f4ac',
  fire: '1f525',
  clap: '1f44f',
  laugh: '1f602',
  sad: '1f622',
  party: '1f389',
  rocket: '1f680',
  eyes: '1f440',
  muscle: '1f4aa',
  hundred: '1f4af',
  wink: '1f609',
  target: '1f3af',
  'speaking-head': '1f5e3_fe0f',
  camera: '1f4f8',
  gift: '1f381',
  'check-mark': '2705',
  'sparkling-heart': '1f496',
  'musical-notes': '1f3b6',
};

const CODEPOINT_TO_SLUG = Object.fromEntries(
  Object.entries(NOTO_CODEPOINT_BY_SLUG).map(([slug, cp]) => [cp, slug]),
) as Record<string, string>;

/** Unicode character(s) → bundled Noto asset slug */
export const NOTO_CHAR_MAP: Record<string, NotoEmojiSlug> = {
  '😊': 'smile',
  '🙂': 'slight-smile',
  '😁': 'grin',
  '🙏': 'pray',
  '❤': 'heart',
  '❤️': 'heart',
  '👍': 'thumbs-up',
  '📚': 'book',
  '✨': 'sparkles',
  '💚': 'green-heart',
  '⭐': 'star',
  '👋': 'wave',
  '💬': 'speech',
  '🔥': 'fire',
  '👏': 'clap',
  '😂': 'laugh',
  '😢': 'sad',
  '🎉': 'party',
  '🚀': 'rocket',
  '👀': 'eyes',
  '💪': 'muscle',
  '💯': 'hundred',
  '😉': 'wink',
  '🎯': 'target',
  '🗣': 'speaking-head',
  '🗣️': 'speaking-head',
  '📸': 'camera',
  '🎁': 'gift',
  '✅': 'check-mark',
  '💖': 'sparkling-heart',
  '🎶': 'musical-notes',
  '🎵': 'musical-notes',
};

/** Not in Noto Animation catalog — map to closest animated asset. */
const NOTO_CHAR_FALLBACK: Record<string, NotoEmojiSlug> = {
  '🎙': 'speaking-head',
  '🎙️': 'speaking-head',
  '🎤': 'speaking-head',
  '🎤️': 'speaking-head',
  '🎧': 'musical-notes',
  '🎧️': 'musical-notes',
  '💗': 'sparkling-heart',
  '💕': 'sparkling-heart',
};

export const FAMILY_REACTION_NOTO: Record<FamilyReactionType, NotoEmojiSlug> = {
  fire: 'fire',
  heart: 'heart',
  target: 'target',
  clap: 'clap',
  thumbs_up: 'thumbs-up',
  laugh: 'laugh',
  sad: 'sad',
  party: 'party',
  star: 'star',
  rocket: 'rocket',
  eyes: 'eyes',
  pray: 'pray',
  muscle: 'muscle',
  hundred: 'hundred',
  wink: 'wink',
};

const UNICODE_EMOJI_RE = emojiRegex();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Noto fallbacks for glyphs missing from emoji-regex (e.g. studio mic 🎙️). */
const EXTRA_EMOJI_PATTERN = [...new Set(Object.keys(NOTO_CHAR_FALLBACK))]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join('|');

const EMOJI_TOKEN_SOURCE = EXTRA_EMOJI_PATTERN
  ? `(?:${UNICODE_EMOJI_RE.source}|${EXTRA_EMOJI_PATTERN})`
  : UNICODE_EMOJI_RE.source;

const EMOJI_SPLIT_RE = new RegExp(`(${EMOJI_TOKEN_SOURCE})`, UNICODE_EMOJI_RE.flags);

function charVariants(char: string): string[] {
  const base = char.replace(/\uFE0F/g, '');
  return [...new Set([char, base, `${base}\uFE0F`])];
}

export function resolveNotoSlug(char: string): NotoEmojiSlug | null {
  for (const variant of charVariants(char)) {
    const mapped = NOTO_CHAR_MAP[variant] ?? NOTO_CHAR_FALLBACK[variant];
    if (mapped && hasNotoLottieSlug(mapped)) return mapped;
  }

  const codepoint = emojiToCodepointSlug(char);
  for (const slug of notoSlugVariants(codepoint)) {
    if (hasNotoLottieSlug(slug)) return slug;
    const named = CODEPOINT_TO_SLUG[slug];
    if (named && hasNotoLottieSlug(named)) return named;
  }

  return null;
}

export type EmojiTextPart =
  | { type: 'text'; value: string }
  | { type: 'emoji'; value: string; notoSlug: NotoEmojiSlug };

/** Split text into plain segments and animated Noto emoji tokens. */
export function splitEmojiText(text: string): EmojiTextPart[] {
  if (!text) return [];

  const parts = text.split(EMOJI_SPLIT_RE).filter((part) => part.length > 0);

  return parts.map((part) => {
    const notoSlug = resolveNotoSlug(part);
    return notoSlug
      ? { type: 'emoji' as const, value: part, notoSlug }
      : { type: 'text' as const, value: part };
  });
}

export type SiteEmoji = {
  char: string;
  notoKey: NotoEmojiSlug;
  label: string;
};

/** Quick-pick / composer emojis — all animated via bundled Noto Lottie. */
export const SITE_EMOJIS: SiteEmoji[] = [
  { char: '😊', notoKey: 'smile', label: 'لبخند' },
  { char: '🙂', notoKey: 'slight-smile', label: 'لبخند ملایم' },
  { char: '😁', notoKey: 'grin', label: 'خندش' },
  { char: '🙏', notoKey: 'pray', label: 'تشکر' },
  { char: '❤️', notoKey: 'heart', label: 'قلب' },
  { char: '👍', notoKey: 'thumbs-up', label: 'عالی' },
  { char: '📚', notoKey: 'book', label: 'دوره' },
  { char: '✨', notoKey: 'sparkles', label: 'درخشش' },
  { char: '💚', notoKey: 'green-heart', label: 'قلب سبز' },
  { char: '⭐', notoKey: 'star', label: 'ستاره' },
  { char: '👋', notoKey: 'wave', label: 'سلام' },
  { char: '💬', notoKey: 'speech', label: 'پیام' },
  { char: '🎙️', notoKey: 'speaking-head', label: 'پادکست' },
  { char: '📸', notoKey: 'camera', label: 'دوربین' },
  { char: '🎁', notoKey: 'gift', label: 'هدیه' },
];

export const SITE_EMOJI_BY_CHAR = Object.fromEntries(
  SITE_EMOJIS.flatMap((e) => [
    [e.char, e],
    [e.char.replace(/\uFE0F/g, ''), e],
    [`${e.char.replace(/\uFE0F/g, '')}\uFE0F`, e],
  ]),
) as Record<string, SiteEmoji>;

/** @deprecated Use NotoEmojiSlug */
export type NotoEmojiKey = NotoEmojiSlug;
