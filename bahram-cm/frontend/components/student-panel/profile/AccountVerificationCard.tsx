import Link from 'next/link';
import { BadgeCheck, ChevronLeft } from 'lucide-react';
import {
  accountStatusLabel,
  ACCOUNT_STATUS_HINT_FA,
  IDENTITY_CARD_HINT_FA,
  identityStatusLabel,
} from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

type CardAction = {
  href: string;
  label: string;
  variant: 'primary' | 'secondary';
};

function resolveVerificationCard(user: StudentUser): { hint: string; action: CardAction | null; success?: boolean } {
  const level = user.verification_level ?? 1;
  const status = user.identity_status ?? 'not_started';

  if (level >= 3 || (status === 'approved' && level >= 2 && user.mobile_ownership_status === 'verified')) {
    return { hint: ACCOUNT_STATUS_HINT_FA[3], action: null, success: true };
  }

  if (status === 'approved' || level >= 2) {
    return {
      hint: ACCOUNT_STATUS_HINT_FA[2],
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
    hint: IDENTITY_CARD_HINT_FA.not_started,
    action: {
      href: '/panel/identity-verification',
      label: 'شروع تأیید هویت',
      variant: 'primary',
    },
  };
}

export function AccountVerificationCard({ user }: { user: StudentUser }) {
  const level = user.verification_level ?? 1;
  const status = user.identity_status;
  const { hint, action, success } = resolveVerificationCard(user);

  return (
    <section className="card panel-profile-section">
      <header className="panel-profile-section__header">
        <span className="panel-profile-section__icon panel-profile-section__icon--profile" aria-hidden>
          <BadgeCheck size={20} strokeWidth={2} />
        </span>
        <div className="panel-profile-section__heading">
          <h2 className="panel-profile-section__title">تأیید حساب کاربری</h2>
          <p className="panel-profile-section__desc">
            وضعیت فعلی: {accountStatusLabel(level)}
            {status ? ` — ${identityStatusLabel(status)}` : ''}
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body space-y-3">
        <p className="text-sm leading-relaxed text-text-muted">{hint}</p>
        {success ? (
          <p className="text-sm font-medium text-success">حساب شما تأیید شده است.</p>
        ) : action ? (
          <Link
            href={action.href}
            className={`btn ${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} inline-flex items-center gap-1`}
          >
            {action.label}
            <ChevronLeft size={16} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
