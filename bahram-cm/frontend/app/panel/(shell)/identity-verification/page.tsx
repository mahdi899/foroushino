import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { IdentityVerificationWizard } from '@/components/student-panel/identity/IdentityVerificationWizard';
import { splitDisplayName } from '@/lib/student/displayName';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';

export const metadata: Metadata = {
  title: 'تأیید هویت | پنل کاربری',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type IdentityState = {
  identity_status?: string;
  can_submit?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  city?: string | null;
  required_corrections?: string[];
};

function buildIdentityDraft(state: IdentityState | null, userName?: string, profile?: { first_name?: string | null; last_name?: string | null; city?: string | null } | null) {
  const draft = {
    first_name: state?.first_name?.trim() ?? '',
    last_name: state?.last_name?.trim() ?? '',
    national_code: '',
    date_of_birth: state?.date_of_birth ?? '',
    gender: state?.gender ?? '',
    city: state?.city?.trim() ?? '',
  };

  if (!draft.first_name && profile?.first_name) draft.first_name = profile.first_name.trim();
  if (!draft.last_name && profile?.last_name) draft.last_name = profile.last_name.trim();
  if (!draft.city && profile?.city) draft.city = profile.city.trim();

  if (!draft.first_name && userName) {
    const split = splitDisplayName(userName);
    draft.first_name = split.first_name;
    if (!draft.last_name) draft.last_name = split.last_name;
  }

  return draft;
}

export default async function IdentityVerificationPage() {
  const user = await getCurrentStudent();
  let state: IdentityState | null = null;

  try {
    const res = await studentFetch<{ data: IdentityState & { status?: string } }>('/identity-verification');
    state = {
      ...res.data,
      identity_status: res.data.identity_status ?? res.data.status,
    };
  } catch {
    state = {
      identity_status: user?.identity_status ?? 'not_started',
    };
  }

  const initialDraft = buildIdentityDraft(state, user?.name, user?.profile);

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={ShieldCheck}
        title="تأیید هویت"
        description="اطلاعات رسمی و مدارک خود را مرحله‌به‌مرحله تکمیل کنید تا حساب شما تأیید شود."
        backLink={{ href: '/panel/profile', label: 'بازگشت به پروفایل' }}
      />
      <IdentityVerificationWizard
        initialStatus={state?.identity_status ?? user?.identity_status}
        initialCanSubmit={state?.can_submit ?? true}
        initialDraft={initialDraft}
        correctionItems={state?.required_corrections ?? null}
      />
    </div>
  );
}
