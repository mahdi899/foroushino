import Link from 'next/link';
import { BadgeCheck, ChevronLeft } from 'lucide-react';
import { ProfileCardHead } from '@/components/student-panel/profile/ProfileCardHead';
import { cn } from '@/lib/cn';
import { formatDateFa } from '@/lib/persian';
import { getStudentLegalName, hasIdentityLegalFields } from '@/lib/student/displayName';
import { identityStatusLabel } from '@/lib/student/identityLabels';
import type { StudentUser } from '@/lib/student/session';

const GENDER_FA: Record<string, string> = {
  male: 'مرد',
  female: 'زن',
};

const LOCKED_STATUSES = new Set(['submitted', 'under_review', 'approved']);

type IdentityField = {
  key: string;
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
};

function buildIdentityFields(user: StudentUser, locked: boolean): IdentityField[] {
  const identity = user.identity;
  const fields: IdentityField[] = [];

  if (locked) {
    const fullName = getStudentLegalName(user);
    if (fullName) {
      fields.push({ key: 'full_name', label: 'نام کامل', value: fullName });
    }
  } else {
    if (identity?.first_name?.trim()) {
      fields.push({ key: 'first_name', label: 'نام', value: identity.first_name.trim() });
    }
    if (identity?.last_name?.trim()) {
      fields.push({ key: 'last_name', label: 'نام خانوادگی', value: identity.last_name.trim() });
    }
  }

  if (identity?.city?.trim()) {
    fields.push({ key: 'city', label: 'شهر', value: identity.city.trim() });
  }
  if (identity?.date_of_birth) {
    fields.push({ key: 'dob', label: 'تاریخ تولد', value: formatDateFa(identity.date_of_birth) });
  }
  if (identity?.gender) {
    fields.push({ key: 'gender', label: 'جنسیت', value: GENDER_FA[identity.gender] ?? identity.gender });
  }
  if (user.national_code_masked) {
    fields.push({
      key: 'national_code',
      label: 'کد ملی',
      value: user.national_code_masked,
      dir: 'ltr',
    });
  }

  return fields;
}

function IdentityFieldsGrid({ fields, dense }: { fields: IdentityField[]; dense?: boolean }) {
  return (
    <dl className={cn('panel-identity-summary__grid', dense && 'panel-identity-summary__grid--dense')}>
      {fields.map((field) => (
        <div
          key={field.key}
          className={cn('panel-identity-summary__item', dense && 'panel-identity-summary__item--dense')}
        >
          <dt>{field.label}</dt>
          <dd dir={field.dir}>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function VerifiedIdentitySection({ user }: { user: StudentUser }) {
  const status = user.identity_status ?? 'not_started';
  const identity = user.identity;
  const hasData = hasIdentityLegalFields(user) || Boolean(identity?.city?.trim());

  if (!hasData && (status === 'not_started' || status === 'rejected')) {
    return null;
  }

  const locked = LOCKED_STATUSES.has(status);
  const fields = buildIdentityFields(user, locked);

  if (locked) {
    return (
      <section className="card panel-identity-summary panel-identity-summary--verified panel-profile-section--wide">
        <ProfileCardHead
          icon={BadgeCheck}
          title="اطلاعات رسمی هویت"
          iconTone="gold"
          badge={status === 'approved' ? 'تأییدشده' : identityStatusLabel(status)}
          badgeTone={status === 'approved' ? 'gold' : 'pending'}
        />
        <IdentityFieldsGrid fields={fields} dense />
      </section>
    );
  }

  return (
    <section className="card panel-profile-section panel-profile-section--wide panel-identity-summary">
      <header className="panel-profile-section__header">
        <span className="panel-profile-section__icon panel-profile-section__icon--profile" aria-hidden>
          <BadgeCheck size={20} strokeWidth={2} />
        </span>
        <div className="panel-profile-section__heading">
          <h2 className="panel-profile-section__title">اطلاعات رسمی هویت</h2>
          <p className="panel-profile-section__desc">
            {`وضعیت: ${identityStatusLabel(status)} — برای تغییر به فرآیند تأیید هویت بروید.`}
          </p>
        </div>
      </header>
      <div className="panel-profile-section__body">
        <IdentityFieldsGrid fields={fields} />
        <Link
          href="/panel/identity-verification"
          className="btn btn-secondary mt-4 inline-flex items-center gap-1"
        >
          {status === 'needs_correction' ? 'اصلاح و ارسال مجدد' : 'ادامه تأیید هویت'}
          <ChevronLeft size={16} />
        </Link>
      </div>
    </section>
  );
}
