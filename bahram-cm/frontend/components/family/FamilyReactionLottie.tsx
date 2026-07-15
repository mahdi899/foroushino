'use client';

/**
 * Animated reactions — Google Noto Emoji Animation (Lottie)
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';
import fireData from '@/assets/lottie/noto/fire.json';
import heartData from '@/assets/lottie/noto/heart.json';
import targetData from '@/assets/lottie/noto/target.json';
import clapData from '@/assets/lottie/noto/clap.json';
import type { FamilyReactionType } from '@/lib/family/types';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const NOTO_REACTIONS: Record<FamilyReactionType, object> = {
  fire: fireData,
  heart: heartData,
  target: targetData,
  clap: clapData,
};

const REACTION_PX = 26;

export function FamilyReactionLottie({
  type,
  active,
  playKey,
}: {
  type: FamilyReactionType;
  active: boolean;
  playKey: number;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const hostRef = useRef<HTMLSpanElement>(null);

  const clampSvgSize = useCallback(() => {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    svg.setAttribute('width', String(REACTION_PX));
    svg.setAttribute('height', String(REACTION_PX));
    svg.style.width = `${REACTION_PX}px`;
    svg.style.height = `${REACTION_PX}px`;
    svg.style.maxWidth = `${REACTION_PX}px`;
    svg.style.maxHeight = `${REACTION_PX}px`;
    svg.style.display = 'block';
  }, []);

  useEffect(() => {
    clampSvgSize();
    const t = window.setTimeout(clampSvgSize, 0);
    return () => window.clearTimeout(t);
  }, [type, clampSvgSize]);

  useEffect(() => {
    if (playKey === 0) return;
    lottieRef.current?.goToAndPlay(0, true);
    clampSvgSize();
  }, [playKey, clampSvgSize]);

  useEffect(() => {
    const inst = lottieRef.current;
    if (!inst) return;
    if (active) {
      inst.goToAndPlay(0, true);
    } else if (playKey === 0) {
      inst.goToAndStop(0, true);
    }
  }, [active, playKey]);

  return (
    <span ref={hostRef} className="family-reaction-icon" aria-hidden>
      <Lottie
        lottieRef={lottieRef}
        animationData={NOTO_REACTIONS[type]}
        loop={active}
        autoplay={active}
        style={{ width: REACTION_PX, height: REACTION_PX }}
        onDOMLoaded={clampSvgSize}
        onComplete={clampSvgSize}
      />
    </span>
  );
}
