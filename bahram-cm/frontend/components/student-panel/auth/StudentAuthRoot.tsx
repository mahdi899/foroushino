'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentAuthProvider, useStudentAuth } from './StudentAuthContext';
import { StudentLoginModal } from './StudentLoginModal';

function StudentAuthUrlSyncInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useStudentAuth();
  const handledAuthRef = useRef(false);

  useEffect(() => {
    const wantsPanelAuth = searchParams.get('auth') === 'panel';

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
  }, [searchParams, router, isLoggedIn]);

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
      <Suspense fallback={null}>
        <StudentAuthUrlSyncInner />
      </Suspense>
      <StudentLoginModal />
      {children}
    </StudentAuthProvider>
  );
}
