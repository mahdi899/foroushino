import Link from 'next/link';
import { BadgeCheck, ChevronLeft } from 'lucide-react';
import {
  accountStatusLabel,
  ACCOUNT_STATUS_HINT_FA,
  identityStatusLabel,
} from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

export function AccountVerificationCard({ user }: { user: StudentUser }) {
  const level = user.verification_level ?? 1;
  const status = user.identity_status;
  const approved = level >= 2 || status === 'approved';

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
        <p className="text-sm leading-relaxed text-text-muted">
          {ACCOUNT_STATUS_HINT_FA[level] ?? ACCOUNT_STATUS_HINT_FA[1]}
        </p>
        {!approved || status === 'needs_correction' || status === 'draft' || status === 'not_started' ? (
          <Link href="/panel/identity-verification" className="btn btn-primary inline-flex items-center gap-1">
            {status === 'needs_correction' ? 'اصلاح و ارسال مجدد' : 'شروع تأیید هویت'}
            <ChevronLeft size={16} />
          </Link>
        ) : status === 'submitted' || status === 'under_review' ? (
          <Link href="/panel/identity-verification" className="btn btn-secondary inline-flex items-center gap-1">
            پیگیری وضعیت
            <ChevronLeft size={16} />
          </Link>
        ) : level === 2 ? (
          <Link href="/panel/referrals" className="btn btn-secondary inline-flex items-center gap-1">
            تأیید مالکیت شماره برای برداشت
            <ChevronLeft size={16} />
          </Link>
        ) : (
          <p className="text-sm font-medium text-success">حساب شما تأیید شده است.</p>
        )}
      </div>
    </section>
  );
}
