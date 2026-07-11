import Link from 'next/link';
import { BadgeCheck, ChevronLeft } from 'lucide-react';
import { accountStatusLabel, identityStatusLabel } from '@/lib/student/identityLabels';
import { resolveVerificationCard } from '@/lib/student/verificationCard';
import type { StudentUser } from '@/lib/student/session';

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
        {hint ? <p className="text-sm leading-relaxed text-text-muted">{hint}</p> : null}
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
