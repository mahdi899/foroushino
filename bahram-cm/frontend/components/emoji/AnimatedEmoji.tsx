'use client';

/**
 * Animated emoji — bundled Noto Emoji Animation (Lottie), no external CDN.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import Lottie, { type LottieRefCurrentProps } from 'lottie-react';
import { useCallback, useEffect, useRef } from 'react';
import { getNotoLottie } from '@/lib/emoji/noto-lottie';
import type { NotoEmojiSlug } from '@/lib/emoji/noto-registry';
import { cn } from '@/lib/utils';

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

  const startPlayback = useCallback(() => {
    const inst = lottieRef.current;
    if (!inst) return;
    clampSvgSize();
    if (mode === 'reaction' && playKeyRef.current <= 0) {
      inst.goToAndStop(0, true);
      return;
    }
    inst.goToAndPlay(0, true);
  }, [clampSvgSize, mode]);

  const freezeStatic = useCallback(() => {
    const inst = lottieRef.current;
    if (!inst) return;
    const total = inst.getDuration(true) ?? 1;
    const lastFrame = Math.max(0, Math.floor(total) - 1);
    inst.goToAndStop(lastFrame, true);
    clampSvgSize();
  }, [clampSvgSize]);

  useEffect(() => {
    const t = window.setTimeout(startPlayback, 0);
    return () => window.clearTimeout(t);
  }, [notoKey, mode, playKey, startPlayback]);

  useEffect(() => {
    if (!loop) return;
    const resume = () => {
      if (document.visibilityState === 'visible') startPlayback();
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [loop, startPlayback]);

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
        autoplay
        style={{ width: size, height: size }}
        onDOMLoaded={startPlayback}
        onComplete={!loop ? freezeStatic : undefined}
      />
    </span>
  );
}
