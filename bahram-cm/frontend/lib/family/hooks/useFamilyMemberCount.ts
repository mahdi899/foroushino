'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { readFamilyShellSnapshot, writeFamilyShellSnapshot } from '@/lib/family/shellCache';

export function useFamilyMemberCount(initial?: number) {
  const bootCount = useMemo(() => {
    if (typeof initial === 'number') return initial;
    return readFamilyShellSnapshot()?.memberCount;
  }, [initial]);

  const [memberCount, setMemberCount] = useState<number | undefined>(bootCount);

  useEffect(() => {
    if (typeof bootCount === 'number') {
      setMemberCount(bootCount);
    }
  }, [bootCount]);

  const syncMemberCount = useCallback((next?: number) => {
    if (typeof next !== 'number' || Number.isNaN(next)) return;
    setMemberCount(next);
    writeFamilyShellSnapshot({ memberCount: next });
  }, []);

  return { memberCount, syncMemberCount };
}
