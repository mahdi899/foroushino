import { VerificationActionCta } from '@/components/student-panel/profile/VerificationActionCta';
import { resolveVerificationCard } from '@/lib/student/verificationCard';
import type { StudentUser } from '@/lib/student/session';

export function ProfileAccountOverview({ user }: { user: StudentUser }) {
  const verification = resolveVerificationCard(user);
  const identityStatus = user.identity_status ?? 'not_started';
  const level = user.verification_level ?? 1;
  const hideGenericHint = level === 1 && identityStatus === 'not_started';
  const footerHint = verification.hint && !hideGenericHint ? verification.hint : null;

  if (!footerHint && !verification.action && !verification.success) {
    return null;
  }

  return (
    <section className="card panel-profile-overview panel-profile-overview--in-grid">
      <div className="panel-profile-overview__footer">
        {footerHint ? <p className="panel-profile-overview__hint">{footerHint}</p> : null}
        {verification.success ? (
          <p className="panel-profile-overview__success">همه مراحل تأیید حساب انجام شده است.</p>
        ) : verification.action ? (
          <VerificationActionCta action={verification.action} />
        ) : null}
      </div>
    </section>
  );
}
