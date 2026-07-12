'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { StudentAuthProvider, useStudentAuth } from './StudentAuthContext';
import { StudentLoginModal } from './StudentLoginModal';

function StudentAuthUrlSyncInner() {
  const router = useRouter();
  const { isLoggedIn } = useStudentAuth();
  const handledAuthRef = useRef(false);

  useEffect(() => {
    const wantsPanelAuth = new URLSearchParams(window.location.search).get('auth') === 'panel';

    if (!wantsPanelAuth) {
      handledAuthRef.current = false;
      return;
    }

    if (isLoggedIn) {
      handledAuthRef.current = false;
      router.replace('/panel');
      return;
    }

    if (!handledAuthRef.current) {
      handledAuthRef.current = true;
      router.replace('/panel/login?redirect=%2Fpanel');
    }
  }, [router, isLoggedIn]);

  return null;
}

import type { StudentFormPrefill } from '@/lib/student/formPrefill';

export function StudentAuthRoot({
  children,
  initialLoggedIn = false,
  initialDisplayName = null,
  initialPrefill = null,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
  initialDisplayName?: string | null;
  initialPrefill?: StudentFormPrefill | null;
}) {
  return (
    <StudentAuthProvider
      initialLoggedIn={initialLoggedIn}
      initialDisplayName={initialDisplayName}
      initialPrefill={initialPrefill}
    >
      <StudentAuthUrlSyncInner />
      <StudentLoginModal />
      {children}
    </StudentAuthProvider>
  );
}
