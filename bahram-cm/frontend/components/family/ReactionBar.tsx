'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import {
  FAMILY_DEFAULT_REACTIONS,
  FAMILY_PICKER_REACTIONS,
} from '@/lib/family/reactions';
import { removeReaction, setReaction } from '@/lib/family/api';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

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
        count > 0 && 'family-reaction-btn--counted',
        active && 'family-reaction-btn--active',
        disabled && 'pointer-events-none opacity-45',
      )}
    >
      <FamilyReactionLottie type={type} playKey={playKey} />
      {count > 0 && (
        <span className={cn('family-reaction-count', active && 'family-reaction-count--active')}>
          {count.toLocaleString('en-US')}
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
  const [counts, setCounts] = useState<FamilyPostStats>(() => ({
    fire: stats.fire ?? 0,
    heart: stats.heart ?? 0,
    target: stats.target ?? 0,
    clap: stats.clap ?? 0,
    thumbs_up: stats.thumbs_up ?? 0,
    laugh: stats.laugh ?? 0,
    sad: stats.sad ?? 0,
    party: stats.party ?? 0,
    star: stats.star ?? 0,
    rocket: stats.rocket ?? 0,
    eyes: stats.eyes ?? 0,
    pray: stats.pray ?? 0,
    muscle: stats.muscle ?? 0,
    hundred: stats.hundred ?? 0,
    wink: stats.wink ?? 0,
    comments: stats.comments ?? 0,
    action_responses: stats.action_responses ?? 0,
  }));
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

  const defaultTypes = new Set(FAMILY_DEFAULT_REACTIONS.map((r) => r.type));
  const extraWithCounts = FAMILY_PICKER_REACTIONS.filter((r) => counts[r.type] > 0);

  return (
    <div ref={rootRef} className="family-reaction-bar" dir="ltr">
      {FAMILY_DEFAULT_REACTIONS.map((r) => (
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

      {extraWithCounts.map((r) => (
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

      <button
        type="button"
        aria-label="واکنش‌های بیشتر"
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
          {FAMILY_PICKER_REACTIONS.map((r) => (
            <ReactionButton
              key={r.type}
              type={r.type}
              label={r.label}
              count={defaultTypes.has(r.type) ? counts[r.type] : 0}
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
