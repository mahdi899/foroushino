'use client';

import Link from 'next/link';
import { ChevronLeft, Smartphone } from 'lucide-react';
import { useIsPhoneClient } from '@/lib/device/useIsPhoneClient';
import type { VerificationCardAction } from '@/lib/student/verificationCard';
import { cn } from '@/lib/cn';

export function VerificationActionCta({
  action,
  className,
  style = 'overview',
}: {
  action: VerificationCardAction;
  className?: string;
  style?: 'overview' | 'secondary';
}) {
  const isPhone = useIsPhoneClient();

  if (isPhone === null) {
    return null;
  }

  if (!isPhone) {
    return (
      <div className={cn('panel-profile-overview__mobile-only', className)}>
        <p className="panel-profile-overview__mobile-only-text">
          <Smartphone size={14} className="inline-block shrink-0" aria-hidden />
          {action.label} — فقط از گوشی موبایل
        </p>
      </div>
    );
  }

  return (
    <Link
      href={action.href}
      className={cn(
        style === 'secondary'
          ? 'btn btn-secondary inline-flex items-center gap-1'
          : cn(
              'btn panel-profile-overview__cta',
              action.variant === 'primary'
                ? 'panel-profile-overview__cta--primary'
                : 'panel-profile-overview__cta--accent',
            ),
        className,
      )}
    >
      {action.label}
      <ChevronLeft size={16} />
    </Link>
  );
}
