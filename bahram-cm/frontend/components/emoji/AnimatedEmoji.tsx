'use client';

/**
 * Animated emoji — bundled Noto Emoji Animation (Lottie), no external CDN.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { getNotoLottie } from '@/lib/emoji/noto-lottie';
import type { NotoEmojiSlug } from '@/lib/emoji/noto-registry';
import { cn } from '@/lib/utils';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export type AnimatedEmojiMode = 'loop' | 'inline' | 'reaction';

export function AnimatedEmoji({
  notoKey,
  size = 24,
  mode = 'inline',
  playKey = 0,
  className,
  label,
}: {
  notoKey: NotoEmojiSlug;
  size?: number;
  mode?: AnimatedEmojiMode;
  playKey?: number;
  className?: string;
  label?: string;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const playKeyRef = useRef(playKey);
  playKeyRef.current = playKey;
  const loop = mode === 'loop';
  const animationData = getNotoLottie(notoKey);

  const clampSvgSize = useCallback(() => {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
    svg.style.maxWidth = `${size}px`;
    svg.style.maxHeight = `${size}px`;
    svg.style.display = 'block';
  }, [size]);

  const playReaction = useCallback(() => {
    lottieRef.current?.goToAndPlay(0, true);
    clampSvgSize();
  }, [clampSvgSize]);

  const stopReaction = useCallback(() => {
    lottieRef.current?.goToAndStop(0, true);
    clampSvgSize();
  }, [clampSvgSize]);

  const freezeStatic = useCallback(() => {
    const inst = lottieRef.current;
    if (!inst) return;
    const total = inst.getDuration(true) ?? 1;
    const lastFrame = Math.max(0, Math.floor(total) - 1);
    inst.goToAndStop(lastFrame, true);
    clampSvgSize();
  }, [clampSvgSize]);

  const playLoop = useCallback(() => {
    lottieRef.current?.goToAndPlay(0, true);
    clampSvgSize();
  }, [clampSvgSize]);

  useEffect(() => {
    clampSvgSize();
    const t = window.setTimeout(() => {
      clampSvgSize();
      if (mode === 'loop') {
        playLoop();
      } else if (mode === 'inline') {
        lottieRef.current?.goToAndPlay(0, true);
      } else if (mode === 'reaction') {
        if (playKeyRef.current > 0) playReaction();
        else stopReaction();
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [notoKey, mode, clampSvgSize, playLoop, playReaction, stopReaction]);

  useEffect(() => {
    if (mode !== 'loop') return;
    const resume = () => {
      if (document.visibilityState === 'visible') playLoop();
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [mode, playLoop]);

  useEffect(() => {
    if (mode !== 'reaction' || playKey === 0) return;
    playReaction();
  }, [playKey, mode, playReaction]);

  if (!animationData) return null;

  return (
    <span
      ref={hostRef}
      className={cn('inline-flex shrink-0 items-center justify-center align-middle', className)}
      style={{ width: size, height: size }}
      aria-hidden={!label}
      title={label}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={loop}
        style={{ width: size, height: size }}
        onDOMLoaded={() => {
          clampSvgSize();
          if (mode === 'loop') {
            playLoop();
          } else if (mode === 'reaction') {
            if (playKeyRef.current > 0) playReaction();
            else stopReaction();
          } else if (mode === 'inline') {
            lottieRef.current?.goToAndPlay(0, true);
          }
        }}
        onComplete={mode === 'reaction' ? freezeStatic : undefined}
      />
    </span>
  );
}
