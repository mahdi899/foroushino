'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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
