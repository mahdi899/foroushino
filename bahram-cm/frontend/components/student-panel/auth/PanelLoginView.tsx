'use client';

import Link from 'next/link';
import { StudentLoginForm } from './StudentLoginForm';

export function PanelLoginView({ redirectTo }: { redirectTo: string }) {
  return (
    <main id="main-content" className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      <StudentLoginForm redirectTo={redirectTo} variant="page" active />
      <Link
        href="/"
        className="mt-6 text-sm text-mist transition hover:text-emerald-glow"
      >
        بازگشت به سایت
      </Link>
    </main>
  );
}
