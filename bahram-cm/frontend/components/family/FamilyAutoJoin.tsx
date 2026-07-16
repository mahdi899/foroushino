'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { joinFamily } from '@/lib/family/api';
import { buildFamilyJoinContext } from '@/lib/family/join-context';

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
        await joinFamily(buildFamilyJoinContext(searchParams));
        router.refresh();
      } catch {
        started.current = false;
      }
    })();
  }, [router, searchParams]);

  return null;
}
