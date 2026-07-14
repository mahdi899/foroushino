'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { removeReaction, setReaction } from '@/lib/family/api';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

const REACTIONS: { type: FamilyReactionType; emoji: string; label: string }[] = [
  { type: 'fire', emoji: '🔥', label: 'آتشین' },
  { type: 'heart', emoji: '❤️', label: 'قلب' },
  { type: 'target', emoji: '🎯', label: 'هدف' },
  { type: 'clap', emoji: '👏', label: 'تشویق' },
];

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
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          type="button"
          aria-label={r.label}
          onClick={() => toggle(r.type)}
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition active:scale-95',
            active === r.type ? 'bg-gold/20 text-gold' : 'bg-white/5 text-bone/60 hover:bg-white/10',
          )}
        >
          <span>{r.emoji}</span>
          {counts[r.type] > 0 && <span className="tabular-nums">{counts[r.type]}</span>}
        </button>
      ))}
    </div>
  );
}
