'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type {} from '@/types/spotplayer';

interface Props {
  licenseKey: string;
  courseId: string;
  itemId?: string | number | null;
}

export function SpotPlayerEmbed({ licenseKey, courseId, itemId }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<SpotPlayerInstance | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const openPlayer = useCallback(async () => {
    if (!elRef.current) return;
    setState('loading');
    setError('');

    try {
      await fetch('/api/spotx', { credentials: 'same-origin' });
    } catch {
      // Cookie sync is best-effort; SpotPlayer may still accept the current cookie.
    }

    try {
      if (!window.SpotPlayer) {
        throw new Error('اسکریپت SpotPlayer هنوز بارگذاری نشده است.');
      }
      playerRef.current?.Destroy?.();
      const player = new window.SpotPlayer(elRef.current, '/api/spotx', false);
      playerRef.current = player;
      await player.Open(licenseKey, courseId, itemId ?? null);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در راه‌اندازی پلیر.');
      setState('error');
    }
  }, [licenseKey, courseId, itemId]);

  useEffect(() => {
    void openPlayer();
    return () => playerRef.current?.Destroy?.();
  }, [openPlayer]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      <div ref={elRef} className={`h-full w-full ${state === 'ready' ? '' : 'invisible'}`} />
      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="h-9 w-9 animate-spin opacity-70" />
          <p className="text-sm opacity-70">در حال بارگذاری پلیر...</p>
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <AlertCircle className="h-9 w-9 text-red-400" />
          <p className="text-sm text-red-200">{error}</p>
          <button type="button" onClick={() => void openPlayer()} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
            تلاش مجدد
          </button>
        </div>
      )}
    </div>
  );
}
