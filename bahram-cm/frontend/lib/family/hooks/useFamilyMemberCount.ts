'use client';

import { useCallback, useEffect, useState } from 'react';
import { readFamilyShellSnapshot, writeFamilyShellSnapshot } from '@/lib/family/shellCache';

export function useFamilyMemberCount(initial?: number) {
  // SSR + first client paint must match — never read localStorage in useState initializer.
  const [memberCount, setMemberCount] = useState<number | undefined>(() =>
    typeof initial === 'number' ? initial : undefined,
  );

  useEffect(() => {
    if (typeof initial === 'number') {
      setMemberCount(initial);
      return;
    }

    const cached = readFamilyShellSnapshot()?.memberCount;
    if (typeof cached === 'number') {
      setMemberCount(cached);
    }
  }, [initial]);

  const syncMemberCount = useCallback((next?: number) => {
    if (typeof next !== 'number' || Number.isNaN(next)) return;
    setMemberCount(next);
    writeFamilyShellSnapshot({ memberCount: next });
  }, []);

  return { memberCount, syncMemberCount };
}
