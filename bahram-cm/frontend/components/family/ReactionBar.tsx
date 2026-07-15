'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import { removeReaction, setReaction } from '@/lib/family/api';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

const REACTIONS: { type: FamilyReactionType; label: string }[] = [
  { type: 'fire', label: 'آتشین' },
  { type: 'heart', label: 'قلب' },
  { type: 'target', label: 'هدف' },
  { type: 'clap', label: 'تشویق' },
];

function ReactionButton({
  type,
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  type: FamilyReactionType;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const [playKey, setPlayKey] = useState(0);

  const handleClick = () => {
    setPlayKey((k) => k + 1);
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
        'family-reaction-btn',
        active && 'family-reaction-btn--active',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      <FamilyReactionLottie type={type} active={active} playKey={playKey} />
      {count > 0 && (
        <span className={cn('family-reaction-count', active && 'family-reaction-count--active')}>
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
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => (
        <ReactionButton
          key={r.type}
          type={r.type}
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
