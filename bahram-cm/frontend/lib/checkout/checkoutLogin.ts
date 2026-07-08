'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';
import { useStudentAuthOptional } from '@/components/student-panel/auth/StudentAuthContext';

export const CHECKOUT_AUTOPAY_PARAM = 'autopay';

export function buildCheckoutLoginReturnUrl(pathname: string, search: string): string {
  const query = new URLSearchParams(search);
  query.set(CHECKOUT_AUTOPAY_PARAM, '1');
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?${CHECKOUT_AUTOPAY_PARAM}=1`;
}

type CheckoutLoginGateOptions = {
  /** Server-known login state when auth context is unavailable during SSR. */
  isLoggedIn?: boolean;
};

export function useCheckoutLoginGate(options?: CheckoutLoginGateOptions) {
  const auth = useStudentAuthOptional();
  const pathname = usePathname();
  const router = useRouter();
  const isLoggedIn = options?.isLoggedIn ?? auth?.isLoggedIn ?? false;

  const requireLoginOr = useCallback(
    (run: () => void | Promise<void>) => {
      if (isLoggedIn) {
        void run();
        return;
      }

      const search = typeof window !== 'undefined' ? window.location.search : '';
      const redirectTo = buildCheckoutLoginReturnUrl(pathname, search);

      if (auth?.openLogin) {
        auth.openLogin({ redirectTo });
        return;
      }

      router.push(`/panel/login?redirect=${encodeURIComponent(redirectTo)}`);
    },
    [auth, isLoggedIn, pathname, router],
  );

  return { isLoggedIn, requireLoginOr };
}

export function useCheckoutAutopay(isReady: boolean, onAutopay: () => void | Promise<void>) {
  const pathname = usePathname();
  const router = useRouter();
  const triggered = useRef(false);

  useEffect(() => {
    if (!isReady || triggered.current || typeof window === 'undefined') return;

    const query = new URLSearchParams(window.location.search);
    if (query.get(CHECKOUT_AUTOPAY_PARAM) !== '1') return;

    triggered.current = true;
    query.delete(CHECKOUT_AUTOPAY_PARAM);
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);

    void onAutopay();
  }, [isReady, onAutopay, pathname, router]);
}
