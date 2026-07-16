'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { FamilyBodyPortal } from '@/components/family/FamilyBodyPortal';
import { FamilyReactionLottie } from '@/components/family/FamilyReactionLottie';
import { FAMILY_ALL_REACTIONS } from '@/lib/family/reactions';
import { removeReaction, setReaction } from '@/lib/family/api';
import { ReactionFlyBurst, type ReactionFlyBurstPayload } from '@/components/family/ReactionFlyBurst';
import type { FamilyPostStats, FamilyReactionType } from '@/lib/family/types';

function ReactionButton({
  type,
  label,
  count,
  active,
  disabled,
  compact = false,
  menuItem = false,
  incoming = false,
  slam = false,
  slamLand = false,
  launching = false,
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
  incoming?: boolean;
  slam?: boolean;
  slamLand?: boolean;
  launching?: boolean;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  onClick: (source?: HTMLButtonElement) => void;
}) {
  return (
    <span
      className={cn(
        'family-reaction-btn-wrap',
        slam && slamLand && 'family-reaction-btn-wrap--slam-land',
        slam && !slamLand && 'family-reaction-btn-wrap--slam',
      )}
    >
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
          incoming && 'family-reaction-btn--incoming',
          slam && slamLand && 'family-reaction-btn--slam-land',
          slam && !slamLand && 'family-reaction-btn--slam',
          launching && 'family-reaction-btn--launching',
          disabled && 'pointer-events-none opacity-45',
        )}
      >
        <FamilyReactionLottie type={type} size={compact ? 24 : 18} mode="loop" />
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
const PICKER_FLY_DELAY_MS = 150;
const SLAM_MS = 760;
const POST_IMPACT_MS = 820;
/** 3×2.375rem rows + gaps + padding — keep close to real grid so first paint isn’t far off */
const PICKER_FALLBACK_HEIGHT = 96;
const PICKER_FALLBACK_WIDTH = 216;

export type ReactionBarHandle = {
  openPicker: (anchor?: HTMLElement | null) => void;
  /** Telegram-style double-tap: fly+slam heart (or toggle it off if already active). */
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
  { postId, stats, userReaction, readOnly = false, onLockedInteract, pickerAnchorRef },
  ref,
) {
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
  const [launchingType, setLaunchingType] = useState<FamilyReactionType | null>(null);
  const [incomingReaction, setIncomingReaction] = useState<FamilyReactionType | null>(null);
  const [slamType, setSlamType] = useState<FamilyReactionType | null>(null);
  const [slamLandType, setSlamLandType] = useState<FamilyReactionType | null>(null);
  const [flyAnim, setFlyAnim] = useState<ReactionFlyBurstPayload | null>(null);
  const [pickInFlight, setPickInFlight] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerAnchorElRef = useRef<HTMLElement | null>(null);
  const reactionBtnRefs = useRef<Partial<Record<FamilyReactionType, HTMLButtonElement | null>>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActive(userReaction);
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

  const measureReactionChip = useCallback((type: FamilyReactionType) => {
    const destEl = reactionBtnRefs.current[type];
    if (!destEl) return null;
    const rect = destEl.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  /** Fallback only after mount wait — approximate landing just before the + button (LTR bar). */
  const predictChipNearAddButton = useCallback(() => {
    const add = addBtnRef.current;
    if (!add) return null;
    const rect = add.getBoundingClientRect();
    const estimatedHalfWidth = 21;
    const gap = 6;
    return {
      x: rect.left - gap - estimatedHalfWidth,
      y: rect.top + rect.height / 2,
    };
  }, []);

  const waitForChipDestination = useCallback(
    (type: FamilyReactionType, attempt = 0): Promise<{ x: number; y: number } | null> =>
      new Promise((resolve) => {
        const point = measureReactionChip(type);
        if (point) {
          resolve(point);
          return;
        }
        if (attempt >= 36) {
          resolve(predictChipNearAddButton());
          return;
        }
        window.requestAnimationFrame(() => {
          void waitForChipDestination(type, attempt + 1).then(resolve);
        });
      }),
    [measureReactionChip, predictChipNearAddButton],
  );

  const persistReactionChange = useCallback(
    async (
      type: FamilyReactionType,
      wasActive: boolean,
      prevActive: FamilyReactionType | null,
      prevCounts: FamilyPostStats,
    ) => {
      setPending(true);
      try {
        if (wasActive) {
          await removeReaction(postId);
        } else {
          await setReaction(postId, type);
        }
      } catch {
        setActive(prevActive);
        setCounts(prevCounts);
        setIncomingReaction(null);
        setFlyAnim(null);
        setPickInFlight(false);
        setLaunchingType(null);
      } finally {
        setPending(false);
      }
    },
    [postId],
  );

  const applyReactionOptimistic = useCallback(
    (type: FamilyReactionType, opts?: { incoming?: boolean }) => {
      const wasActive = active === type;
      const prevActive = active;
      const prevCounts = counts;
      const isNewSlot = !wasActive && counts[type] === 0;

      flushSync(() => {
        setCounts((c) => {
          const next = { ...c };
          if (prevActive) next[prevActive] = Math.max(0, next[prevActive] - 1);
          if (!wasActive) next[type] += 1;
          return next;
        });
        setActive(wasActive ? null : type);
        if (opts?.incoming && isNewSlot) setIncomingReaction(type);
      });

      return { wasActive, prevActive, prevCounts, isNewSlot };
    },
    [active, counts],
  );

  const triggerPostImpact = useCallback(() => {
    const bubble = rootRef.current?.closest('.family-post-bubble') as HTMLElement | null;
    if (!bubble) return;
    bubble.classList.remove('family-post-bubble--impact');
    void bubble.offsetWidth;
    bubble.classList.add('family-post-bubble--impact');
    window.setTimeout(() => bubble.classList.remove('family-post-bubble--impact'), POST_IMPACT_MS);
  }, []);

  const playBarReactionFeedback = useCallback(
    (type: FamilyReactionType, fromFly = false) => {
      setSlamLandType(fromFly ? type : null);
      setSlamType(type);
      triggerPostImpact();
      window.setTimeout(() => {
        setSlamType(null);
        setSlamLandType(null);
      }, SLAM_MS);
    },
    [triggerPostImpact],
  );

  const handleBarReaction = (type: FamilyReactionType) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (pending || pickInFlight) return;
    void toggle(type);
    playBarReactionFeedback(type);
  };

  const finishFlyAnimation = useCallback(
    (type: FamilyReactionType) => {
      setIncomingReaction(null);
      setFlyAnim(null);
      setLaunchingType(null);
      setPickInFlight(false);
      playBarReactionFeedback(type, true);
    },
    [playBarReactionFeedback],
  );

  const startFlyToChip = useCallback(
    async (type: FamilyReactionType, from: { x: number; y: number }, isNewSlot: boolean) => {
      if (isNewSlot) setIncomingReaction(type);
      // Layout after flushSync — prefer real chip center, never the + button first.
      const to =
        measureReactionChip(type) ??
        (await new Promise<{ x: number; y: number } | null>((resolve) => {
          window.requestAnimationFrame(() => {
            const next = measureReactionChip(type);
            if (next) {
              resolve(next);
              return;
            }
            void waitForChipDestination(type).then(resolve);
          });
        }));
      if (!to) {
        finishFlyAnimation(type);
        return;
      }
      setFlyAnim({
        id: Date.now(),
        type,
        from,
        to,
      });
    },
    [finishFlyAnimation, measureReactionChip, waitForChipDestination],
  );

  const handlePick = (type: FamilyReactionType, sourceEl: HTMLButtonElement) => {
    if (readOnly) {
      onLockedInteract?.();
      return;
    }
    if (pending || pickInFlight) return;

    const wasActive = active === type;
    setPickerClosing(true);

    if (wasActive) {
      void toggle(type);
      window.setTimeout(() => {
        setPickerOpen(false);
        setPickerClosing(false);
        setLaunchingType(null);
      }, PICKER_BURST_MS);
      return;
    }

    setLaunchingType(type);
    setPickInFlight(true);
    const fromRect = sourceEl.getBoundingClientRect();
    const from = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 };

    const { prevActive, prevCounts, isNewSlot } = applyReactionOptimistic(type, { incoming: true });
    void persistReactionChange(type, false, prevActive, prevCounts);

    window.setTimeout(() => {
      setPickerOpen(false);
      window.setTimeout(() => {
        setPickerClosing(false);
        setLaunchingType(null);
      }, PICKER_BURST_MS);
    }, PICKER_FLY_DELAY_MS);

    void startFlyToChip(type, from, isNewSlot);
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
    quickReact: (type: FamilyReactionType = 'heart', at?: { x: number; y: number }) => {
      if (readOnly) {
        onLockedInteract?.();
        return;
      }
      if (pending || pickInFlight) return;

      const wasActive = active === type;

      if (wasActive) {
        void toggle(type);
        playBarReactionFeedback(type);
        return;
      }

      setPickInFlight(true);
      const from = at ?? measureReactionChip(type) ?? predictChipNearAddButton() ?? { x: 0, y: 0 };
      const { prevActive, prevCounts, isNewSlot } = applyReactionOptimistic(type, { incoming: true });
      void persistReactionChange(type, false, prevActive, prevCounts);
      void startFlyToChip(type, from, isNewSlot);
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
              disabled={pending || pickInFlight}
              compact
              menuItem
              launching={launchingType === r.type}
              onClick={(source) => source && handlePick(r.type, source)}
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
            disabled={pending}
            incoming={incomingReaction === r.type}
            slam={slamType === r.type}
            slamLand={slamLandType === r.type}
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
            disabled={pending}
            onClick={togglePicker}
            className={cn(
              'family-reaction-add',
              pickerOpen && 'family-reaction-add--open',
              pending && 'pointer-events-none opacity-45',
            )}
          >
            <SmilePlus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
        </div>
      </div>
      {picker}
      {flyAnim && (
        <ReactionFlyBurst anim={flyAnim} onComplete={() => finishFlyAnimation(flyAnim.type)} />
      )}
    </>
  );
});
