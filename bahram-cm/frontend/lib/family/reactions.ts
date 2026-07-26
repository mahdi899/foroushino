import type { FamilyReactionType } from '@/lib/family/types';

export type FamilyReactionMeta = {
  type: FamilyReactionType;
  label: string;
  emoji: string;
};

/** 5 quick reactions always visible in the bar */
export const FAMILY_DEFAULT_REACTIONS: FamilyReactionMeta[] = [
  { type: 'fire', label: 'آتشین', emoji: '🔥' },
  { type: 'heart', label: 'قلب', emoji: '❤️' },
  { type: 'clap', label: 'تشویق', emoji: '👏' },
  { type: 'thumbs_up', label: 'عالی', emoji: '👍' },
  { type: 'laugh', label: 'خنده', emoji: '😂' },
];

/** 10 more in the + picker (15 total) */
export const FAMILY_PICKER_REACTIONS: FamilyReactionMeta[] = [
  { type: 'target', label: 'هدف', emoji: '🎯' },
  { type: 'sad', label: 'غمگین', emoji: '😢' },
  { type: 'party', label: 'جشن', emoji: '🎉' },
  { type: 'star', label: 'ستاره', emoji: '⭐' },
  { type: 'rocket', label: 'موشک', emoji: '🚀' },
  { type: 'eyes', label: 'چشم', emoji: '👀' },
  { type: 'pray', label: 'دعا', emoji: '🙏' },
  { type: 'muscle', label: 'قدرت', emoji: '💪' },
  { type: 'hundred', label: 'صد', emoji: '💯' },
  { type: 'wink', label: 'چشمک', emoji: '😉' },
];

export const FAMILY_ALL_REACTIONS: FamilyReactionMeta[] = [
  ...FAMILY_DEFAULT_REACTIONS,
  ...FAMILY_PICKER_REACTIONS,
];

export const FAMILY_REACTION_EMOJI: Record<FamilyReactionType, string> = Object.fromEntries(
  FAMILY_ALL_REACTIONS.map((r) => [r.type, r.emoji]),
) as Record<FamilyReactionType, string>;

export function reactionMeta(type: FamilyReactionType): FamilyReactionMeta {
  return (
    FAMILY_ALL_REACTIONS.find((r) => r.type === type) ?? {
      type,
      label: type,
      emoji: FAMILY_REACTION_EMOJI[type] ?? '✨',
    }
  );
}
