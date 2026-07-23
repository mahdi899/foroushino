'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';
import { SmilePlus } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import { FAMILY_ALL_REACTIONS } from '@/lib/family/reactions';
import { removeReaction, setReaction } from '@/lib/family/api';
import { familyFeedDebug } from '@/lib/family/feedDebug';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

const PICKER_GAP = 6;
const PULSE_MS = 280;
const PICKER_FALLBACK_HEIGHT = 96;
const PICKER_FALLBACK_WIDTH = 216;

function ReactionButton({
  type,
  label,
  count,
  active,
  disabled,
  compact = false,
  menuItem = false,
  pulse = false,
  burstPlayKey = 0,
  reduceMotion = false,
  buttonRef,
  onClick,
  onBurstComplete,
}: {
  type: FamilyReactionType;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  compact?: boolean;
  menuItem?: boolean;
  pulse?: boolean;
  burstPlayKey?: number;
  reduceMotion?: boolean;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onClick: (source?: HTMLButtonElement) => void;
  onBurstComplete?: () => void;
}) {
  const showBurst = !reduceMotion && burstPlayKey > 0;

  return (
    <span className={cn('family-reaction-btn-wrap', pulse && 'family-reaction-btn-wrap--pulse')}>
      <button
        ref={buttonRef}
        type="button"
        role={menuItem ? 'menuitem' : undefined}
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e.currentTarget);
        }}
        className={cn(
          'family-reaction-btn',
          count > 0 && 'family-reaction-btn--counted',
          active && 'family-reaction-btn--active',
          compact && 'family-reaction-btn--compact',
          pulse && 'family-reaction-btn--pulse',
          disabled && 'pointer-events-none opacity-45',
        )}
      >
        <span className="family-reaction-icon-slot" style={{ width: compact ? 24 : 18, height: compact ? 24 : 18 }}>
          {showBurst ? (
            <FamilyReactionLottie
              key={`burst-${type}-${burstPlayKey}`}
              type={type}
              size={compact ? 24 : 18}
              mode="inline"
              playKey={burstPlayKey}
              onComplete={onBurstComplete}
            />
          ) : (
            <FamilyReactionLottie type={type} size={compact ? 24 : 18} mode="reaction" playKey={0} />
          )}
        </span>
        {count > 0 && (
          <span className={cn('family-reaction-count', active && 'family-reaction-count--active')}>
            {count.toLocaleString('en-US')}
          </span>
        )}
      </button>
    </span>
  );
}

type PickerPosition = {
  left: number;
  top: number;
};

export type ReactionBarHandle = {
  openPicker: (anchor?: HTMLElement | null) => void;
  /** Double-tap / quick react — in-place Lottie only (no fly-across). */
  quickReact: (type?: FamilyReactionType, at?: { x: number; y: number }) => void;
};

export const ReactionBar = forwardRef<
  ReactionBarHandle,
  {
    postId: number;
    stats: FamilyPostStats;
    userReaction: FamilyReactionType | null;
    readOnly?: boolean;
    onLockedInteract?: () => void;
    pickerAnchorRef?: RefObject<HTMLElement | null>;
  }
>(function ReactionBar(
  {
    postId,
    stats,
    userReaction,
    readOnly = false,
    onLockedInteract,
    pickerAnchorRef,
  },
  ref,
) {
  useFamilyDebugRender(`ReactionBar:${postId}`);
  const reduceMotion = useReducedMotion();
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
    views: stats.views ?? 0,
  }));
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState<PickerPosition | null>(null);
  const [pickerSession, setPickerSession] = useState(0);
  const [pulseType, setPulseType] = useState<FamilyReactionType | null>(null);
  const [burstType, setBurstType] = useState<FamilyReactionType | null>(null);
  const [burstPlayKey, setBurstPlayKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerAnchorElRef = useRef<HTMLElement | null>(null);
  const reactionBtnRefs = useRef<Partial<Record<FamilyReactionType, HTMLButtonElement | null>>>({});
  const activeRef = useRef<FamilyReactionType | null>(userReaction);
  const reactionBusyRef = useRef(false);

  const isReactionBusy = useCallback(
    () => reactionBusyRef.current || pending,
    [pending],
  );

  const lockReactionCommit = useCallback(() => {
    if (reactionBusyRef.current) return false;
    reactionBusyRef.current = true;
    return true;
  }, []);

  const unlockReactionCommit = useCallback(() => {
    reactionBusyRef.current = false;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActive(userReaction);
    activeRef.current = userReaction;
  }, [userReaction]);

  const updatePickerPosition = useCallback(() => {
    const anchor =
      pickerAnchorElRef.current ?? pickerAnchorRef?.current ?? addBtnRef.current ?? rootRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const pickerHeight = pickerRef.current?.offsetHeight || PICKER_FALLBACK_HEIGHT;
    const pickerWidth = pickerRef.current?.offsetWidth || PICKER_FALLBACK_WIDTH;
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceAbove >= pickerHeight + PICKER_GAP || spaceAbove >= spaceBelow;
    const top = above ? rect.top - PICKER_GAP - pickerHeight : rect.bottom + PICKER_GAP;
    const maxLeft = Math.max(8, window.innerWidth - pickerWidth - 8);

    setPickerPos((prev) => {
      const next = {
        left: Math.min(Math.max(8, rect.left), maxLeft),
        top: Math.max(8, top),
      };
      if (prev && prev.left === next.left && prev.top === next.top) return prev;
      return next;
    });
  }, [pickerAnchorRef]);

  const setPickerNode = useCallback(
    (node: HTMLDivElement | null) => {
      pickerRef.current = node;
      if (node) updatePickerPosition();
    },
    [updatePickerPosition],
  );

  useLayoutEffect(() => {
    if (!pickerOpen) {
      setPickerPos(null);
      return;
    }

    updatePickerPosition();
    let frame2 = 0;
    const frame = window.requestAnimationFrame(() => {
      updatePickerPosition();
      frame2 = window.requestAnimationFrame(updatePickerPosition);
    });
    const onLayout = () => updatePickerPosition();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);

    const picker = pickerRef.current;
    let ro: ResizeObserver | null = null;
    if (picker && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updatePickerPosition());
      ro.observe(picker);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(frame2);
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      ro?.disconnect();
    };
  }, [pickerOpen, pickerSession, updatePickerPosition]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      setPickerOpen(false);
    };
    const id = window.setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [pickerOpen]);

  const visibleReactions = useMemo(
    () =>
      FAMILY_ALL_REACTIONS.filter((r) => counts[r.type] > 0 || active === r.type).sort(
        (a, b) => counts[b.type] - counts[a.type],
      ),
    [counts, active],
  );

  const playInPlaceFeedback = useCallback(
    (type: FamilyReactionType) => {
      if (reduceMotion) {
        setPulseType(type);
        window.setTimeout(() => setPulseType(null), PULSE_MS);
        return;
      }
      setBurstType(type);
      setBurstPlayKey((k) => k + 1);
      setPulseType(type);
      window.setTimeout(() => setPulseType(null), PULSE_MS);
    },
    [reduceMotion],
  );

  const clearBurst = useCallback(() => {
    setBurstType(null);
  }, []);

  const toggle = async (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (!lockReactionCommit()) return;
    setPending(true);
    const wasActive = activeRef.current === type;
    const prevActive = activeRef.current;
    const prevCounts = counts;
    const nextActive = wasActive ? null : type;
    activeRef.current = nextActive;
    familyFeedDebug.mark(`reaction:${postId}:${type}`);
    familyFeedDebug.info('reaction', wasActive ? 'remove' : 'set', { postId, type });

    setCounts((c) => {
      const next = { ...c };
      if (prevActive) next[prevActive] = Math.max(0, next[prevActive] - 1);
      if (!wasActive) next[type] += 1;
      return next;
    });
    setActive(nextActive);

    try {
      if (wasActive) {
        await removeReaction(postId);
      } else {
        await setReaction(postId, type);
      }
      familyFeedDebug.measure(`reaction:${postId}:${type}`, 'reaction', { postId, type, ok: true });
    } catch (err) {
      familyFeedDebug.error('reaction', 'persist failed', {
        postId,
        type,
        error: String(err),
      });
      activeRef.current = prevActive;
      setActive(prevActive);
      setCounts(prevCounts);
    } finally {
      setPending(false);
      unlockReactionCommit();
    }
  };

  const persistReactionChange = useCallback(
    async (
      type: FamilyReactionType,
      wasActive: boolean,
      prevActive: FamilyReactionType | null,
      prevCounts: FamilyPostStats,
    ) => {
      const mark = `reaction:${postId}:${type}`;
      familyFeedDebug.mark(mark);
      setPending(true);
      try {
        if (wasActive) {
          await removeReaction(postId);
        } else {
          await setReaction(postId, type);
        }
        familyFeedDebug.measure(mark, 'reaction', { postId, type, ok: true, wasActive });
      } catch (err) {
        familyFeedDebug.error('reaction', 'persist failed', {
          postId,
          type,
          error: String(err),
        });
        activeRef.current = prevActive;
        setActive(prevActive);
        setCounts(prevCounts);
        unlockReactionCommit();
      } finally {
        setPending(false);
        unlockReactionCommit();
      }
    },
    [postId, unlockReactionCommit],
  );

  const applyReactionOptimistic = useCallback(
    (type: FamilyReactionType) => {
      const wasActive = activeRef.current === type;
      const prevActive = activeRef.current;
      const prevCounts = counts;
      const nextActive = wasActive ? null : type;
      activeRef.current = nextActive;

      flushSync(() => {
        setCounts((c) => {
          const next = { ...c };
          if (prevActive) next[prevActive] = Math.max(0, next[prevActive] - 1);
          if (!wasActive) next[type] += 1;
          return next;
        });
        setActive(nextActive);
      });

      return { wasActive, prevActive, prevCounts };
    },
    [counts],
  );

  const handleBarReaction = (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (isReactionBusy()) return;
    void toggle(type);
    playInPlaceFeedback(type);
  };

  const handlePick = (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (!lockReactionCommit()) return;

    const wasActive = activeRef.current === type;
    setPickerOpen(false);

    if (wasActive) {
      unlockReactionCommit();
      void toggle(type);
      playInPlaceFeedback(type);
      return;
    }

    const { prevActive, prevCounts } = applyReactionOptimistic(type);
    playInPlaceFeedback(type);
    void persistReactionChange(type, false, prevActive, prevCounts);
  };

  const openPickerMenu = useCallback(
    (anchor?: HTMLElement | null) => {
      if (readOnly) {
        onLockedInteract?.();
        return;
      }
      const el = anchor ?? pickerAnchorRef?.current ?? addBtnRef.current ?? rootRef.current;
      pickerAnchorElRef.current = el;
      if (el) {
        const rect = el.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - PICKER_FALLBACK_WIDTH - 8);
        setPickerPos({
          left: Math.min(Math.max(8, rect.left), maxLeft),
          top: Math.max(8, rect.top - PICKER_GAP - PICKER_FALLBACK_HEIGHT),
        });
      }
      setPickerOpen(true);
      setPickerSession((session) => session + 1);
    },
    [onLockedInteract, pickerAnchorRef, readOnly],
  );

  useImperativeHandle(ref, () => ({
    openPicker: openPickerMenu,
    quickReact: (type: FamilyReactionType = 'heart') => {
      if (readOnly) {
        onLockedInteract?.();
        return;
      }
      if (!lockReactionCommit()) return;

      const wasActive = activeRef.current === type;
      familyFeedDebug.info('reaction', 'quickReact', { postId, type, wasActive });

      if (wasActive) {
        unlockReactionCommit();
        void toggle(type);
        playInPlaceFeedback(type);
        return;
      }

      const { prevActive, prevCounts } = applyReactionOptimistic(type);
      playInPlaceFeedback(type);
      void persistReactionChange(type, false, prevActive, prevCounts);
    },
  }));

  const togglePicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (pickerOpen) {
      setPickerOpen(false);
      return;
    }
    openPickerMenu(addBtnRef.current);
  };

  const hasVisibleReactions = visibleReactions.length > 0;
  const showBar = hasVisibleReactions || !readOnly;

  if (!showBar) return null;

  const showPicker = pickerOpen && pickerPos && mounted;

  const picker =
    showPicker && pickerPos ? (
      <FamilyBodyPortal key={pickerSession}>
        <div
          ref={setPickerNode}
          className={cn(
            'family-reaction-picker family-reaction-picker--portal family-reaction-picker--grid family-portal-surface',
            fontClassName,
          )}
          role="menu"
          aria-label="انتخاب واکنش"
          dir="ltr"
          style={{
            position: 'fixed',
            left: pickerPos.left,
            top: pickerPos.top,
            zIndex: 10001,
          }}
        >
          {FAMILY_ALL_REACTIONS.map((r) => (
            <ReactionButton
              key={r.type}
              type={r.type}
              label={r.label}
              count={0}
              active={active === r.type}
              disabled={isReactionBusy()}
              compact
              menuItem
              reduceMotion={Boolean(reduceMotion)}
              onClick={() => handlePick(r.type)}
            />
          ))}
        </div>
      </FamilyBodyPortal>
    ) : null;

  return (
    <>
      <div className="family-reaction-bar-shell">
        <div ref={rootRef} className="family-reaction-bar" dir="ltr">
          {visibleReactions.map((r) => (
            <ReactionButton
              key={r.type}
              type={r.type}
              label={r.label}
              count={counts[r.type]}
              active={active === r.type}
              disabled={isReactionBusy()}
              pulse={pulseType === r.type}
              burstPlayKey={burstType === r.type ? burstPlayKey : 0}
              reduceMotion={Boolean(reduceMotion)}
              buttonRef={(el) => {
                reactionBtnRefs.current[r.type] = el;
              }}
              onClick={() => handleBarReaction(r.type)}
              onBurstComplete={burstType === r.type ? clearBurst : undefined}
            />
          ))}

          {!readOnly && (
            <button
              ref={addBtnRef}
              type="button"
              aria-label="افزودن واکنش"
              aria-expanded={pickerOpen}
              aria-haspopup="menu"
              disabled={isReactionBusy()}
              onClick={togglePicker}
              className={cn(
                'family-reaction-add',
                pickerOpen && 'family-reaction-add--open',
                isReactionBusy() && 'pointer-events-none opacity-45',
              )}
            >
              <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
      {picker}
    </>
  );
});
