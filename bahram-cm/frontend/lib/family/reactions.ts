import type { FamilyReactionType } from '@/lib/family/types';

export type FamilyReactionMeta = {
  type: FamilyReactionType;
  label: string;
  glyph?: string;
};

/** 5 quick reactions always visible in the bar */
export const FAMILY_DEFAULT_REACTIONS: FamilyReactionMeta[] = [
  { type: 'fire', label: 'آتشین' },
  { type: 'heart', label: 'قلب' },
  { type: 'clap', label: 'تشویق' },
  { type: 'thumbs_up', label: 'عالی' },
  { type: 'laugh', label: 'خنده' },
];

/** 10 more in the + picker (15 total) */
export const FAMILY_PICKER_REACTIONS: FamilyReactionMeta[] = [
  { type: 'target', label: 'هدف' },
  { type: 'sad', label: 'غمگین' },
  { type: 'party', label: 'جشن' },
  { type: 'star', label: 'ستاره' },
  { type: 'rocket', label: 'موشک' },
  { type: 'eyes', label: 'چشم' },
  { type: 'pray', label: 'دعا' },
  { type: 'muscle', label: 'قدرت' },
  { type: 'hundred', label: 'صد' },
  { type: 'wink', label: 'چشمک' },
];

export const FAMILY_ALL_REACTIONS: FamilyReactionMeta[] = [
  ...FAMILY_DEFAULT_REACTIONS,
  ...FAMILY_PICKER_REACTIONS,
];

/** Teaser reactions shown after ~3s dwell on a post (slide-out nudge). */
export const FAMILY_NUDGE_REACTIONS: FamilyReactionMeta[] = [
  { type: 'heart', label: 'قلب', glyph: '❤️' },
  { type: 'fire', label: 'آتشین', glyph: '🔥' },
  { type: 'clap', label: 'تشویق', glyph: '👏' },
];

export function reactionMeta(type: FamilyReactionType): FamilyReactionMeta {
  return FAMILY_ALL_REACTIONS.find((r) => r.type === type) ?? { type, label: type };
}
