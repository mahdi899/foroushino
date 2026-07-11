import type { StudentUser } from '@/lib/student/session';
import { ACCOUNT_STATUS_FA } from '@/lib/student/identityLabels';

export type AccountTierVariant = 'base' | 'identity' | 'full';

export type AccountTier = {
  level: number;
  variant: AccountTierVariant;
  label: string;
  badge: string;
  asideHint: string | null;
};

function effectiveVerificationLevel(user: StudentUser): number {
  const level = user.verification_level ?? 1;
  const status = user.identity_status;

  if (level >= 3) return 3;
  if (level >= 2 || status === 'approved') return 2;
  return 1;
}

export function resolveAccountTier(user: StudentUser): AccountTier {
  const level = effectiveVerificationLevel(user);

  if (level >= 3) {
    return {
      level: 3,
      variant: 'full',
      label: ACCOUNT_STATUS_FA[3],
      badge: 'تأیید کامل',
      asideHint: null,
    };
  }

  if (level >= 2) {
    return {
      level: 2,
      variant: 'identity',
      label: ACCOUNT_STATUS_FA[2],
      badge: 'هویت تأییدشده',
      asideHint: 'برای برداشت کش‌بک، مالکیت موبایل را تأیید کنید.',
    };
  }

  return {
    level: 1,
    variant: 'base',
    label: ACCOUNT_STATUS_FA[1],
    badge: 'دانشجو',
    asideHint: null,
  };
}

export function isIdentityVerified(user: StudentUser): boolean {
  return effectiveVerificationLevel(user) >= 2;
}
