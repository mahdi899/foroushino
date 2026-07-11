import {
  ACCOUNT_STATUS_HINT_FA,
  IDENTITY_CARD_HINT_FA,
} from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

export type VerificationCardAction = {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
};

export type VerificationCardState = {
  hint: string | null;
  action: VerificationCardAction | null;
  success?: boolean;
};

export function resolveVerificationCard(user: StudentUser): VerificationCardState {
  const level = user.verification_level ?? 1;
  const status = user.identity_status ?? 'not_started';

  if (level >= 3) {
    return { hint: null, action: null, success: true };
  }

  if (status === 'approved' || level >= 2) {
    return {
      hint: null,
      action: {
        href: '/panel/referrals',
        label: 'تأیید مالکیت شماره برای برداشت',
        variant: 'secondary',
      },
    };
  }

  if (status === 'submitted' || status === 'under_review') {
    return {
      hint: IDENTITY_CARD_HINT_FA[status],
      action: {
        href: '/panel/identity-verification',
        label: 'پیگیری وضعیت',
        variant: 'secondary',
      },
    };
  }

  if (status === 'needs_correction') {
    return {
      hint: IDENTITY_CARD_HINT_FA.needs_correction,
      action: {
        href: '/panel/identity-verification',
        label: 'اصلاح و ارسال مجدد',
        variant: 'primary',
      },
    };
  }

  if (status === 'rejected') {
    return {
      hint: IDENTITY_CARD_HINT_FA.rejected,
      action: {
        href: '/panel/identity-verification',
        label: 'ارسال مجدد',
        variant: 'primary',
      },
    };
  }

  if (status === 'draft') {
    return {
      hint: IDENTITY_CARD_HINT_FA.draft,
      action: {
        href: '/panel/identity-verification',
        label: 'ادامه تأیید هویت',
        variant: 'primary',
      },
    };
  }

  return {
    hint: ACCOUNT_STATUS_HINT_FA[1],
    action: {
      href: '/panel/identity-verification',
      label: 'شروع تأیید هویت',
      variant: 'primary',
    },
  };
}
