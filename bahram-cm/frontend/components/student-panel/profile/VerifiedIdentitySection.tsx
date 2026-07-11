import Link from 'next/link';
import { BadgeCheck, ChevronLeft } from 'lucide-react';
import { formatDateFa } from '@/lib/persian';
import { hasIdentityLegalFields } from '@/lib/student/displayName';
import { identityStatusLabel } from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

const GENDER_FA: Record<string, string> = {
  male: 'مرد',
  female: 'زن',
};

const LOCKED_STATUSES = new Set(['submitted', 'under_review', 'approved']);

export function VerifiedIdentitySection({ user }: { user: StudentUser }) {
  const status = user.identity_status ?? 'not_started';
  const identity = user.identity;
  const hasData = hasIdentityLegalFields(user) || Boolean(identity?.city?.trim());

  // Entry CTA lives in AccountVerificationCard above — only show this block once data exists.
  if (!hasData && (status === 'not_started' || status === 'rejected')) {
    return null;
  }

  const locked = LOCKED_STATUSES.has(status);

  return (
    <section className="card panel-profile-section panel-profile-section--wide panel-identity-summary">
      <header className="panel-profile-section__header">
        <span className="panel-profile-section__icon panel-profile-section__icon--profile" aria-hidden>
          <BadgeCheck size={20} strokeWidth={2} />
        </span>
        <div className="panel-profile-section__heading">
          <h2 className="panel-profile-section__title">اطلاعات رسمی هویت</h2>
          <p className="panel-profile-section__desc">
            {locked
              ? 'این اطلاعات در پرونده تأیید هویت ثبت شده و از اینجا قابل ویرایش نیست.'
              : `وضعیت: ${identityStatusLabel(status)} — برای تغییر به فرآیند تأیید هویت بروید.`}
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body">
        <dl className="panel-identity-summary__grid">
          <div className="panel-identity-summary__item">
            <dt>نام</dt>
            <dd>{identity?.first_name?.trim() || '—'}</dd>
          </div>
          <div className="panel-identity-summary__item">
            <dt>نام خانوادگی</dt>
            <dd>{identity?.last_name?.trim() || '—'}</dd>
          </div>
          <div className="panel-identity-summary__item">
            <dt>شهر</dt>
            <dd>{identity?.city?.trim() || '—'}</dd>
          </div>
          {identity?.date_of_birth ? (
            <div className="panel-identity-summary__item">
              <dt>تاریخ تولد</dt>
              <dd>{formatDateFa(identity.date_of_birth)}</dd>
            </div>
          ) : null}
          {identity?.gender ? (
            <div className="panel-identity-summary__item">
              <dt>جنسیت</dt>
              <dd>{GENDER_FA[identity.gender] ?? identity.gender}</dd>
            </div>
          ) : null}
          {user.national_code_masked ? (
            <div className="panel-identity-summary__item">
              <dt>کد ملی</dt>
              <dd dir="ltr">{user.national_code_masked}</dd>
            </div>
          ) : null}
        </dl>
        {!locked ? (
          <Link
            href="/panel/identity-verification"
            className="btn btn-secondary mt-4 inline-flex items-center gap-1"
          >
            {status === 'needs_correction' ? 'اصلاح و ارسال مجدد' : 'ادامه تأیید هویت'}
            <ChevronLeft size={16} />
          </Link>
        ) : null}
      </div>
    </section>
  );
}
