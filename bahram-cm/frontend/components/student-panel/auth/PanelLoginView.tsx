'use client';

import Link from 'next/link';
import { StudentLoginForm } from './StudentLoginForm';

export function PanelLoginView({ redirectTo, blocked = false }: { redirectTo: string; blocked?: boolean }) {
  return (
    <main id="main-content" className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10">
      {blocked ? (
        <div
          role="alert"
          className="mb-5 w-full max-w-md rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          حساب کاربری شما مسدود شده است. لطفاً با پشتیبانی تماس بگیرید.
        </div>
      ) : null}
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
