'use client';

import { Smartphone } from 'lucide-react';
import { MOBILE_ONLY_IDENTITY_MESSAGE } from '@/lib/device/mobileClient';
import { useIsPhoneClient } from '@/lib/device/useIsPhoneClient';

export function MobileOnlyGate({
  children,
  title = 'فقط با گوشی موبایل',
  message = MOBILE_ONLY_IDENTITY_MESSAGE,
}: {
  children: React.ReactNode;
  title?: string;
  message?: string;
}) {
  const isPhone = useIsPhoneClient();

  if (isPhone === null) {
    return <div className="card p-6 text-sm text-text-muted">در حال بررسی دستگاه…</div>;
  }

  if (!isPhone) {
    const panelUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/panel/identity-verification` : '/panel/identity-verification';

    return (
      <div className="card p-6 text-center">
        <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Smartphone size={24} strokeWidth={1.8} />
        </span>
        <h2 className="text-base font-bold text-text">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{message}</p>
        <p className="mt-4 break-all text-caption text-text-muted" dir="ltr">
          {panelUrl}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
