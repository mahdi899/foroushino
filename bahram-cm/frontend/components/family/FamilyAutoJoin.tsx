'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinFamily } from '@/lib/family/api';

/** Attempts family join once, then refreshes server state (member feed without manual reload). */
export function FamilyAutoJoin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        await joinFamily({
          source: searchParams.get('utm_source') ?? searchParams.get('src') ?? undefined,
          campaign: searchParams.get('utm_campaign') ?? undefined,
          content: searchParams.get('utm_content') ?? undefined,
          referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        });
        router.refresh();
      } catch {
        started.current = false;
      }
    })();
  }, [router, searchParams]);

  return null;
}
