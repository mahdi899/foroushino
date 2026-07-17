'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureFamilyJoinContext } from '@/lib/family/join-context';

/** Saves entry-link params on first paint so they survive login redirect. */
export function JoinContextBoot() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureFamilyJoinContext(searchParams);
  }, [searchParams]);

  return null;
}
