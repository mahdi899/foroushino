'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { StudentFormPrefill } from '@/lib/student/formPrefill';
import { StudentAuthProvider, useStudentAuth } from './StudentAuthContext';

const StudentLoginModal = dynamic(
  () => import('./StudentLoginModal').then((m) => ({ default: m.StudentLoginModal })),
  { ssr: false },
);

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

function StudentLoginModalGate() {
  const { loginOpen } = useStudentAuth();
  if (!loginOpen) return null;
  return <StudentLoginModal />;
}

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
      <StudentLoginModalGate />
      {children}
    </StudentAuthProvider>
  );
}
