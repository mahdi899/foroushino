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
import { familyHaptic } from '@/lib/family/haptics';
import { fontClassName } from '@/lib/fonts';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import { FAMILY_ALL_REACTIONS } from '@/lib/family/reactions';
import { removeReaction, setReaction } from '@/lib/family/api';
import { familyFeedDebug } from '@/lib/family/feedDebug';
import { useFamilyDebugRender } from '@/lib/family/useFamilyDebugRender';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

function ReactionButton({
  type,
  label,
  count,
  active,
  disabled,
  compact = false,
  menuItem = false,
  pop = false,
  animated = false,
  buttonRef,
  onClick,
}: {
  type: FamilyReactionType;
  label: string;
  count: number;
  active: boolean;
  disabled: boolean;
  compact?: boolean;
  menuItem?: boolean;
  /** Brief, simple scale-in when this chip just appeared in the bar — no flight/impact. */
  pop?: boolean;
  /**
   * Load the Lottie icon. Off for feed chips: every mounted chip is a separate
   * lottie-web SVG animation rebuilt on each virtual-row remount, which dominated
   * scroll cost on low-end phones. Only the picker and a just-tapped chip animate.
   */
  animated?: boolean;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onClick: (source?: HTMLButtonElement) => void;
}) {
  return (
    <span className="family-reaction-btn-wrap">
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
          pop && 'family-reaction-btn--pop',
          disabled && 'pointer-events-none opacity-45',
        )}
      >
        <FamilyReactionLottie
          type={type}
          size={compact ? 22 : 16}
          mode={animated ? 'inline' : 'static'}
        />
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

const PICKER_GAP = 6;
const PICKER_BURST_MS = 360;
/** Simple scale-in when a chip appears in the bar — no flight, no post-wide impact. */
const POP_MS = 260;
/** 3×2.375rem rows + gaps + padding — keep close to real grid so first paint isn’t far off */
const PICKER_FALLBACK_HEIGHT = 96;
/** 5×2.375 + 4×0.25 gap + 2×0.5 padding ≈ 13.875rem */
const PICKER_FALLBACK_WIDTH = 228;

export type ReactionBarHandle = {
  openPicker: (anchor?: HTMLElement | null) => void;
  /** Double-tap quick react: adds the heart chip to the bar (or toggles it off if already active). */
  quickReact: (type?: FamilyReactionType) => void;
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
  const reduceMotion = Boolean(useReducedMotion());
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
  const [pickerClosing, setPickerClosing] = useState(false);
  const [pickerPos, setPickerPos] = useState<PickerPosition | null>(null);
  const [pickerSession, setPickerSession] = useState(0);
  /** Chip currently playing its short pop-in — set right when a new reaction appears in the bar. */
  const [popType, setPopType] = useState<FamilyReactionType | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerAnchorElRef = useRef<HTMLElement | null>(null);
  const reactionBtnRefs = useRef<Partial<Record<FamilyReactionType, HTMLButtonElement | null>>>({});
  const activeRef = useRef<FamilyReactionType | null>(userReaction);
  const reactionBusyRef = useRef(false);

  const isReactionBusy = useCallback(() => reactionBusyRef.current || pending, [pending]);

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
    // Prefer directly above the + button whenever it fits.
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
    if (!pickerOpen && !pickerClosing) {
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
  }, [pickerOpen, pickerClosing, pickerSession, updatePickerPosition]);

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
        setPopType(null);
        unlockReactionCommit();
      } finally {
        setPending(false);
      }
    },
    [postId, unlockReactionCommit],
  );

  const applyReactionOptimistic = useCallback(
    (type: FamilyReactionType) => {
      const wasActive = activeRef.current === type;
      const prevActive = activeRef.current;
      const prevCounts = counts;
      const isNewSlot = !wasActive && counts[type] === 0;
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

      return { wasActive, prevActive, prevCounts, isNewSlot };
    },
    [counts],
  );

  /** Simple, single scale-in on the chip in the bar — no flight, no post-wide impact. */
  const playChipPop = useCallback(
    (type: FamilyReactionType) => {
      familyHaptic('light');
      if (reduceMotion) return;
      setPopType(type);
      window.setTimeout(() => setPopType(null), POP_MS);
    },
    [reduceMotion],
  );

  const handleBarReaction = (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (isReactionBusy()) return;
    void toggle(type);
    familyHaptic('light');
  };

  const handlePick = (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (!lockReactionCommit()) return;

    const wasActive = activeRef.current === type;
    setPickerClosing(true);
    window.setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, PICKER_BURST_MS);

    if (wasActive) {
      unlockReactionCommit();
      void toggle(type);
      return;
    }

    const { prevActive, prevCounts, isNewSlot } = applyReactionOptimistic(type);
    void persistReactionChange(type, false, prevActive, prevCounts);
    unlockReactionCommit();
    if (isNewSlot) playChipPop(type);
  };

  const openPickerMenu = useCallback(
    (anchor?: HTMLElement | null) => {
      if (readOnly) {
        onLockedInteract?.();
        return;
      }
      familyHaptic('selection');
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
      unlockReactionCommit();

      if (wasActive) {
        void toggle(type);
        familyHaptic('light');
        return;
      }

      const { prevActive, prevCounts, isNewSlot } = applyReactionOptimistic(type);
      void persistReactionChange(type, false, prevActive, prevCounts);
      if (isNewSlot) playChipPop(type);
      else familyHaptic('light');
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

  const showPicker = (pickerOpen || pickerClosing) && pickerPos && mounted;

  const picker =
    showPicker && pickerPos ? (
      <FamilyBodyPortal key={pickerSession}>
        <div
          ref={setPickerNode}
          className={cn(
            'family-reaction-picker family-reaction-picker--portal family-reaction-picker--grid family-portal-surface',
            pickerClosing && 'family-reaction-picker--burst',
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
              animated
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
            pop={popType === r.type}
            animated={popType === r.type}
            buttonRef={(el) => {
              reactionBtnRefs.current[r.type] = el;
            }}
            onClick={() => handleBarReaction(r.type)}
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
