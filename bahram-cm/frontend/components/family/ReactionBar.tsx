'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { removeReaction, setReaction } from '@/lib/family/api';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

const REACTIONS: { type: FamilyReactionType; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'آتشین' },
  { type: 'heart', emoji: '❤️', label: 'قلب' },
  { type: 'target', emoji: '🎯', label: 'هدف' },
  { type: 'clap', emoji: '👏', label: 'تشویق' },
];

function ReactionButton({
  emoji,
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  const handleClick = () => {
    setBurstKey((k) => k + 1);
    onClick();
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex items-center gap-1 rounded-xl px-1.5 py-1 transition-all active:scale-[0.95]',
        active
          ? 'bg-gold/15 ring-1 ring-gold/45 opacity-100'
          : 'opacity-70 hover:opacity-100',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      <span className="relative flex h-[30px] w-[30px] items-center justify-center">
        <motion.span
          key={burstKey}
          initial={reduceMotion ? false : { scale: 1 }}
          animate={
            reduceMotion
              ? { scale: active ? 1.08 : 1 }
              : {
                  scale: active ? [1, 1.45, 1.12] : [1, 1.25, 1],
                  rotate: active ? [0, -12, 8, 0] : [0, -6, 0],
                }
          }
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="text-[1.5rem] leading-none select-none"
          aria-hidden
        >
          {emoji}
        </motion.span>
      </span>

      {count > 0 && (
        <span className={cn('min-w-[1ch] tabular-nums text-[13px]', active ? 'text-gold/90' : 'text-bone/55')}>
          {count}
        </span>
      )}
    </button>
  );
}

export function ReactionBar({
  postId,
  stats,
  userReaction,
}: {
  postId: number;
  stats: FamilyPostStats;
  userReaction: FamilyReactionType | null;
}) {
  const [active, setActive] = useState<FamilyReactionType | null>(userReaction);
  const [counts, setCounts] = useState(stats);
  const [pending, setPending] = useState(false);

  const toggle = async (type: FamilyReactionType) => {
    if (pending) return;
    setPending(true);
    const wasActive = active === type;
    const prevActive = active;
    const prevCounts = counts;

    setCounts((c) => {
      const next = { ...c };
      if (prevActive) next[prevActive] = Math.max(0, next[prevActive] - 1);
      if (!wasActive) next[type] += 1;
      return next;
    });
    setActive(wasActive ? null : type);

    try {
      if (wasActive) {
        await removeReaction(postId);
      } else {
        await setReaction(postId, type);
      }
    } catch {
      setActive(prevActive);
      setCounts(prevCounts);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5 lg:gap-3">
      {REACTIONS.map((r) => (
        <ReactionButton
          key={r.type}
          emoji={r.emoji}
          label={r.label}
          count={counts[r.type]}
          active={active === r.type}
          disabled={pending}
          onClick={() => toggle(r.type)}
        />
      ))}
    </div>
  );
}
