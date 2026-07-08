'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ensureSpotPlayerCookie } from '@/lib/spotplayer/ensureSpotPlayerCookie';
import { openSpotPlayer } from '@/lib/spotplayer/playerOpen';
import { waitForSpotPlayer } from '@/lib/spotplayer/waitForSpotPlayer';
import type {} from '@/types/spotplayer';

const SPOTX_URL = '/spotx';

interface Props {
  licenseKey: string;
  courseId: string;
  itemId?: string | number | null;
  /** Wait for lesson list before first Open() — avoids a duplicate player boot. */
  deferUntilItemId?: boolean;
}

export function SpotPlayerEmbed({ licenseKey, courseId, itemId, deferUntilItemId = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SpotPlayerInstance | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');

  const canPlay =
    !deferUntilItemId || (itemId != null && String(itemId).trim() !== '');

  useEffect(() => {
    if (!canPlay || !mountRef.current) return;

    const container = mountRef.current;
    let cancelled = false;

    const run = async () => {
      setState('loading');
      setError('');

      try {
        await ensureSpotPlayerCookie(SPOTX_URL);
        await waitForSpotPlayer();
        if (cancelled) return;

        if (!playerRef.current) {
          container.replaceChildren();
          playerRef.current = new window.SpotPlayer!(container, SPOTX_URL, false);
        } else {
          try {
            await playerRef.current.Stop();
          } catch {
            // Player may not be running yet.
          }
        }

        // Keep iframe visible so the user can confirm browser license activation.
        setState('ready');
        await openSpotPlayer(playerRef.current, licenseKey, courseId, itemId);

        const iframes = container.querySelectorAll('iframe');
        iframes.forEach((iframe, index) => {
          if (index < iframes.length - 1) iframe.remove();
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'خطا در راه‌اندازی پلیر.');
        setState('error');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [canPlay, licenseKey, courseId, itemId, attempt]);

  useEffect(() => {
    return () => {
      playerRef.current?.Destroy?.();
      playerRef.current = null;
      mountRef.current?.replaceChildren();
    };
  }, []);

  const retry = () => {
    playerRef.current?.Destroy?.();
    playerRef.current = null;
    mountRef.current?.replaceChildren();
    setAttempt((value) => value + 1);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <div ref={mountRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0" />

      {!canPlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="h-9 w-9 animate-spin opacity-70" />
          <p className="text-sm opacity-70">در حال آماده‌سازی فهرست درس‌ها...</p>
        </div>
      )}

      {canPlay && state === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 text-white">
          <Loader2 className="h-9 w-9 animate-spin opacity-70" />
          <p className="text-sm opacity-70">در حال بارگذاری پلیر...</p>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
          <AlertCircle className="h-9 w-9 text-red-400" />
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={retry} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
            تلاش مجدد
          </button>
        </div>
      )}
    </div>
  );
}
