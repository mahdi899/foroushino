'use client';

/** Family reaction icon — bundled Noto Emoji Animation (loaded on demand for bursts). */
import { AnimatedEmoji, type AnimatedEmojiMode } from '@/components/emoji/AnimatedEmoji';
import { FAMILY_REACTION_NOTO } from '@/lib/emoji/noto-registry';
import { FAMILY_REACTION_EMOJI } from '@/lib/family/reactions';
import type { FamilyReactionType } from '@/lib/family/types';

export function FamilyReactionLottie({
  type,
  size = 20,
  mode = 'inline',
  playKey = 0,
  onComplete,
}: {
  type: FamilyReactionType;
  size?: number;
  mode?: AnimatedEmojiMode;
  playKey?: number;
  onComplete?: () => void;
}) {
  return (
    <AnimatedEmoji
      notoKey={FAMILY_REACTION_NOTO[type]}
      size={size}
      mode={mode}
      playKey={playKey}
      onComplete={onComplete}
      fallbackChar={FAMILY_REACTION_EMOJI[type]}
      className="family-reaction-icon"
    />
  );
}
