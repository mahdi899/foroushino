'use client';

/**
 * Animated emoji — bundled Noto Emoji Animation (Lottie), no external CDN.
 * Lottie runtime + JSON load on demand; unicode glyph shows until ready.
 * @see https://googlefonts.github.io/noto-emoji-animation/
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';
import { loadNotoLottie } from '@/lib/emoji/noto-lottie';
import { NOTO_CHAR_MAP, type NotoEmojiSlug } from '@/lib/emoji/noto-registry';
import { cn } from '@/lib/utils';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/**
 * `static` renders the unicode glyph only — no Lottie JSON chunk, no lottie-web
 * instance, no rAF. Required for anything that mounts once per feed row: each
 * animated instance builds a large SVG tree and is rebuilt on every remount while
 * scrolling.
 */
export type AnimatedEmojiMode = 'loop' | 'inline' | 'reaction' | 'static';

const SLUG_TO_CHAR: Record<string, string> = Object.fromEntries(
  Object.entries(NOTO_CHAR_MAP).map(([char, slug]) => [slug, char]),
);

export function AnimatedEmoji({
  notoKey,
  size = 24,
  mode = 'inline',
  playKey = 0,
  className,
  label,
  onComplete,
  fallbackChar,
}: {
  notoKey: NotoEmojiSlug;
  size?: number;
  mode?: AnimatedEmojiMode;
  playKey?: number;
  className?: string;
  label?: string;
  onComplete?: () => void;
  /** Prefer this glyph while Lottie loads (defaults to mapped unicode). */
  fallbackChar?: string;
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const playKeyRef = useRef(playKey);
  playKeyRef.current = playKey;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const loop = mode === 'loop';
  const isStatic = mode === 'static';
  const [animationData, setAnimationData] = useState<object | null>(null);
  const glyph = fallbackChar || SLUG_TO_CHAR[notoKey] || '✨';

  useEffect(() => {
    if (isStatic) return;
    let cancelled = false;
    setAnimationData(null);
    void loadNotoLottie(notoKey).then((data) => {
      if (!cancelled) setAnimationData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isStatic, notoKey]);

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
    onCompleteRef.current?.();
  }, [clampSvgSize]);

  useEffect(() => {
    if (!animationData) return;
    const t = window.setTimeout(startPlayback, 0);
    return () => window.clearTimeout(t);
  }, [animationData, notoKey, mode, playKey, startPlayback]);

  useEffect(() => {
    if (!loop || !animationData) return;
    const resume = () => {
      if (document.visibilityState === 'visible') startPlayback();
    };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [animationData, loop, startPlayback]);

  return (
    <span
      ref={hostRef}
      className={cn('inline-flex shrink-0 items-center justify-center align-middle', className)}
      style={{ width: size, height: size, fontSize: size * 0.86, lineHeight: 1 }}
      aria-hidden={!label}
      title={label}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {animationData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay
          style={{ width: size, height: size }}
          onDOMLoaded={startPlayback}
          onComplete={!loop ? freezeStatic : undefined}
        />
      ) : (
        <span aria-hidden className="select-none">
          {glyph}
        </span>
      )}
    </span>
  );
}
