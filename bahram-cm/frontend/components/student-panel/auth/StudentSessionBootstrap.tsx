'use client';

import { useEffect, useRef } from 'react';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { getStudentDisplayName } from '@/lib/student/displayName';
import { buildStudentFormPrefill } from '@/lib/student/formPrefill';
import type { StudentUser } from '@/lib/student/session.types';

/**
 * Hydrates login chrome on marketing pages after paint so root layout
 * can stay free of cookies()/getCurrentStudent() for ISR soft navigations.
 */
export function StudentSessionBootstrap({ enabled }: { enabled: boolean }) {
  const auth = useStudentAuthOptional();
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || !auth || ran.current || auth.isLoggedIn) return;
    ran.current = true;

    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/student/me', {
          signal: controller.signal,
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { data?: StudentUser | null };
        const user = json.data;
        if (!user) return;
        auth.markLoggedIn(getStudentDisplayName(user), buildStudentFormPrefill(user));
      } catch {
        // Stay logged-out in chrome; panel routes still SSR-auth.
      }
    })();

    return () => controller.abort();
  }, [enabled, auth]);

  return null;
}
