import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { IdentityVerificationWizard } from '@/components/student-panel/identity/IdentityVerificationWizard';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';

export const metadata: Metadata = {
  title: 'تأیید هویت | پنل کاربری',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function IdentityVerificationPage() {
  const user = await getCurrentStudent();
  let state: {
    status?: string;
    draft?: Record<string, string>;
    required_corrections?: string[];
  } | null = null;

  try {
    const res = await studentFetch<{ data: typeof state }>('/identity-verification');
    state = res.data;
  } catch {
    state = {
      status: user?.identity_status ?? 'not_started',
    };
  }

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={ShieldCheck}
        title="تأیید هویت"
        description="اطلاعات و مدارک خود را مرحله‌به‌مرحله تکمیل کنید تا حساب شما تأیید شود."
      />
      <IdentityVerificationWizard
        initialStatus={state?.status ?? user?.identity_status}
        initialDraft={state?.draft ?? null}
        correctionItems={state?.required_corrections ?? null}
      />
    </div>
  );
}
