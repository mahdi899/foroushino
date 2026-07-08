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

export function StudentAuthRoot({
  children,
  initialLoggedIn = false,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
}) {
  return (
    <StudentAuthProvider initialLoggedIn={initialLoggedIn}>
      <StudentAuthUrlSyncInner />
      <StudentLoginModal />
      {children}
    </StudentAuthProvider>
  );
}
