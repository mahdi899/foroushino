/**
 * Self-hosted Google Noto Emoji Animation (Lottie).
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import bookData from '@/assets/lottie/noto/book.json';
import clapData from '@/assets/lottie/noto/clap.json';
import eyesData from '@/assets/lottie/noto/eyes.json';
import fireData from '@/assets/lottie/noto/fire.json';
import grinData from '@/assets/lottie/noto/grin.json';
import greenHeartData from '@/assets/lottie/noto/green-heart.json';
import heartData from '@/assets/lottie/noto/heart.json';
import hundredData from '@/assets/lottie/noto/hundred.json';
import laughData from '@/assets/lottie/noto/laugh.json';
import muscleData from '@/assets/lottie/noto/muscle.json';
import partyData from '@/assets/lottie/noto/party.json';
import prayData from '@/assets/lottie/noto/pray.json';
import rocketData from '@/assets/lottie/noto/rocket.json';
import sadData from '@/assets/lottie/noto/sad.json';
import slightSmileData from '@/assets/lottie/noto/slight-smile.json';
import smileData from '@/assets/lottie/noto/smile.json';
import sparklesData from '@/assets/lottie/noto/sparkles.json';
import speechData from '@/assets/lottie/noto/speech.json';
import starData from '@/assets/lottie/noto/star.json';
import targetData from '@/assets/lottie/noto/target.json';
import thumbsUpData from '@/assets/lottie/noto/thumbs-up.json';
import waveData from '@/assets/lottie/noto/wave.json';
import winkData from '@/assets/lottie/noto/wink.json';
import type { FamilyReactionType } from '@/lib/family/types';

export type NotoEmojiKey =
  | 'smile'
  | 'slight-smile'
  | 'grin'
  | 'pray'
  | 'heart'
  | 'thumbs-up'
  | 'book'
  | 'sparkles'
  | 'green-heart'
  | 'star'
  | 'wave'
  | 'speech'
  | 'fire'
  | 'clap'
  | 'laugh'
  | 'sad'
  | 'party'
  | 'rocket'
  | 'eyes'
  | 'muscle'
  | 'hundred'
  | 'wink'
  | 'target';

export const NOTO_LOTTIE: Record<NotoEmojiKey, object> = {
  smile: smileData,
  'slight-smile': slightSmileData,
  grin: grinData,
  pray: prayData,
  heart: heartData,
  'thumbs-up': thumbsUpData,
  book: bookData,
  sparkles: sparklesData,
  'green-heart': greenHeartData,
  star: starData,
  wave: waveData,
  speech: speechData,
  fire: fireData,
  clap: clapData,
  laugh: laughData,
  sad: sadData,
  party: partyData,
  rocket: rocketData,
  eyes: eyesData,
  muscle: muscleData,
  hundred: hundredData,
  wink: winkData,
  target: targetData,
};

/** Unicode character(s) → bundled Noto asset key */
export const NOTO_CHAR_MAP: Record<string, NotoEmojiKey> = {
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
};

export const FAMILY_REACTION_NOTO: Record<FamilyReactionType, NotoEmojiKey> = {
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

const LOOKUP_CHARS = Object.keys(NOTO_CHAR_MAP).sort((a, b) => b.length - a.length);

export function resolveNotoKey(char: string): NotoEmojiKey | null {
  const direct = NOTO_CHAR_MAP[char];
  if (direct) return direct;
  const withFe0f = NOTO_CHAR_MAP[`${char}\uFE0F`];
  if (withFe0f) return withFe0f;
  const withoutFe0f = NOTO_CHAR_MAP[char.replace(/\uFE0F/g, '')];
  return withoutFe0f ?? null;
}

export type EmojiTextPart =
  | { type: 'text'; value: string }
  | { type: 'emoji'; value: string; notoKey: NotoEmojiKey };

/** Split text into plain segments and known self-hosted animated emoji tokens. */
export function splitEmojiText(text: string): EmojiTextPart[] {
  if (!text) return [];
  const pattern = LOOKUP_CHARS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) return [{ type: 'text', value: text }];
  const re = new RegExp(`(${pattern})`, 'gu');
  const parts = text.split(re).filter(Boolean);
  return parts.map((part) => {
    const key = resolveNotoKey(part);
    return key ? { type: 'emoji' as const, value: part, notoKey: key } : { type: 'text' as const, value: part };
  });
}

export type SiteEmoji = {
  char: string;
  notoKey: NotoEmojiKey;
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
];

export const SITE_EMOJI_BY_CHAR = Object.fromEntries(
  SITE_EMOJIS.flatMap((e) => [
    [e.char, e],
    [e.char.replace(/\uFE0F/g, ''), e],
    [`${e.char.replace(/\uFE0F/g, '')}\uFE0F`, e],
  ]),
) as Record<string, SiteEmoji>;
