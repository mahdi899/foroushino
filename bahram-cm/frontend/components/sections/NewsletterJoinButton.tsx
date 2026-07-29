'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';
import { cn } from '@/lib/cn';

const buttonClass =
  'group newsletter-form__submit neon-btn-primary brand-cta inline-flex h-12 min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold transition-[background-color,color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:-translate-y-px active:translate-y-0 md:h-14 md:min-h-14 md:px-10 md:text-lg';

export function NewsletterJoinButton() {
  const pathname = usePathname();
  const auth = useStudentAuthOptional();

  if (auth?.isLoggedIn) {
    return (
      <Link href="/panel" prefetch className={buttonClass}>
        <span className="whitespace-nowrap">پنل دانشجو</span>
        <ArrowLeft
          className="rtl-flip h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 md:h-5 md:w-5"
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={buttonClass}
      onClick={() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        if (auth?.openLogin) {
          auth.openLogin({
            purpose: 'newsletter',
            redirectTo: pathname || '/',
            scrollY: window.scrollY,
          });
          return;
        }
        window.location.assign(`/panel/login?redirect=${encodeURIComponent(pathname || '/')}`);
      }}
    >
      <span className="whitespace-nowrap">عضویت</span>
      <ArrowLeft
        className="rtl-flip h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 md:h-5 md:w-5"
        aria-hidden
      />
    </button>
  );
}
