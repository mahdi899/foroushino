'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAT_TEXT_FONT } from '@/lib/chatbot/emojiFont';
import { ChatRichText } from './ChatRichText';

interface TypingTextProps {
  text: string;
  onComplete?: () => void;
  onProgress?: () => void;
}

function typingPlan(text: string): { step: number; intervalMs: number; instant: boolean } {
  const len = text.length;
  if (len > 350) return { step: len, intervalMs: 0, instant: true };
  if (len > 240) return { step: 4, intervalMs: 12, instant: false };
  if (len > 100) return { step: 2, intervalMs: 18, instant: false };
  return { step: 1, intervalMs: 24, instant: false };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TypingText({ text, onComplete, onProgress }: TypingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onProgressRef = useRef(onProgress);

  onCompleteRef.current = onComplete;
  onProgressRef.current = onProgress;

  useEffect(() => {
    completedRef.current = false;
    setDisplayed('');
    setDone(false);

    if (!text) {
      setDone(true);
      completedRef.current = true;
      onCompleteRef.current?.();
      return;
    }

    const { step, intervalMs, instant } = typingPlan(text);
    if (instant || prefersReducedMotion()) {
      setDisplayed(text);
      setDone(true);
      completedRef.current = true;
      onCompleteRef.current?.();
      return;
    }

    const totalSteps = Math.ceil(text.length / step);
    const maxDurationMs = 4800;
    const tickMs = Math.max(8, Math.min(intervalMs, Math.floor(maxDurationMs / totalSteps)));

    let index = 0;
    let progressTick = 0;
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + step);
      setDisplayed(text.slice(0, index));
      progressTick += 1;
      if (progressTick % 2 === 0) onProgressRef.current?.();

      if (index >= text.length) {
        window.clearInterval(timer);
        setDone(true);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
      }
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <span className="block w-full min-w-0 text-right" dir="rtl" style={{ fontFamily: CHAT_TEXT_FONT }}>
      <ChatRichText text={displayed} />
      {!done && (
        <span
          className="mr-0.5 inline-block h-[1.05em] w-[2px] translate-y-[1px] animate-pulse rounded-full bg-primary/55 align-middle"
          aria-hidden
        />
      )}
    </span>
  );
}
