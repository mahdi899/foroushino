'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
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
      <FamilyReactionLottie type={type} playKey={playKey} />
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [pickerOpen]);

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

  const handlePick = (type: FamilyReactionType) => {
    void toggle(type);
    setPickerOpen(false);
  };

  const visibleTypes = REACTIONS.filter((r) => counts[r.type] > 0).map((r) => r.type);

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-2">
      {visibleTypes.map((type) => {
        const meta = REACTIONS.find((r) => r.type === type)!;
        return (
          <ReactionButton
            key={type}
            type={type}
            label={meta.label}
            count={counts[type]}
            active={active === type}
            disabled={pending}
            onClick={() => toggle(type)}
          />
        );
      })}

      <button
        type="button"
        aria-label="افزودن واکنش"
        aria-expanded={pickerOpen}
        disabled={pending}
        onClick={() => setPickerOpen((o) => !o)}
        className={cn(
          'family-reaction-add',
          pickerOpen && 'family-reaction-add--open',
          pending && 'pointer-events-none opacity-45',
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} />
      </button>

      {pickerOpen && (
        <div className="family-reaction-picker" role="menu" aria-label="انتخاب واکنش">
          {REACTIONS.map((r) => (
            <ReactionButton
              key={r.type}
              type={r.type}
              label={r.label}
              count={0}
              active={active === r.type}
              disabled={pending}
              onClick={() => handlePick(r.type)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
