import Link from 'next/link';
import { BadgeCheck, ChevronLeft, Lock, Radio, Trophy } from 'lucide-react';
import { ACCOUNT_STATUS_HINT_FA, accountStatusLabel, SAT_MEMBERSHIP_FA } from '@/lib/student/identityLabels';
import { resolveVerificationCard } from '@/lib/student/verificationCard';
import type { StudentUser } from '@/lib/student/session';
import { cn } from '@/lib/cn';

function StatusChip({
  icon: Icon,
  title,
  subtitle,
  tone = 'default',
  className,
}: {
  icon: typeof BadgeCheck;
  title: string;
  subtitle?: string;
  tone?: 'default' | 'success' | 'muted' | 'locked';
  className?: string;
}) {
  return (
    <div className={cn('panel-profile-chip', `panel-profile-chip--${tone}`, className)}>
      <span className="panel-profile-chip__icon" aria-hidden>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className="panel-profile-chip__text">
        <span className="panel-profile-chip__title">{title}</span>
        {subtitle ? <span className="panel-profile-chip__sub">{subtitle}</span> : null}
      </span>
    </div>
  );
}

export function ProfileAccountOverview({ user }: { user: StudentUser }) {
  const level = user.verification_level ?? 1;
  const satStatus = user.sat_membership_status ?? 'inactive';
  const satMeta = SAT_MEMBERSHIP_FA[satStatus] ?? SAT_MEMBERSHIP_FA.inactive;
  const verification = resolveVerificationCard(user);
  const identityVerified = level >= 2;
  const identityStatus = user.identity_status ?? 'not_started';
  const showAccountHintInChip = level === 1 && identityStatus === 'not_started';
  const showReferenceChip = !identityVerified;
  const footerHint = verification.hint && !showAccountHintInChip ? verification.hint : null;

  return (
    <section className="card panel-profile-overview panel-profile-overview--in-grid">
      <div className="panel-profile-overview__chips">
        <StatusChip
          icon={BadgeCheck}
          title={accountStatusLabel(level)}
          subtitle={
            showAccountHintInChip
              ? ACCOUNT_STATUS_HINT_FA[1]
              : verification.success
                ? 'کامل'
                : undefined
          }
          tone={level >= 3 ? 'success' : identityVerified ? 'success' : 'default'}
          className={showAccountHintInChip ? 'panel-profile-chip--account' : undefined}
        />
        {showReferenceChip ? (
          <StatusChip icon={Lock} title="کانال مرجع" subtitle="پس از تأیید هویت" tone="locked" />
        ) : (
          <StatusChip icon={Radio} title="کانال مرجع" subtitle="به‌زودی" tone="muted" />
        )}
        <StatusChip
          icon={satStatus === 'active' ? Trophy : Lock}
          title="عضویت سات"
          subtitle={satMeta.label}
          tone={satStatus === 'active' ? 'success' : 'muted'}
        />
      </div>

      {footerHint || verification.action || verification.success ? (
        <div className="panel-profile-overview__footer">
          {footerHint ? <p className="panel-profile-overview__hint">{footerHint}</p> : null}
          {verification.success ? (
            <p className="panel-profile-overview__success">همه مراحل تأیید حساب انجام شده است.</p>
          ) : verification.action ? (
            <Link
              href={verification.action.href}
              className={cn(
                'btn panel-profile-overview__cta',
                verification.action.variant === 'primary'
                  ? 'panel-profile-overview__cta--primary'
                  : 'panel-profile-overview__cta--accent',
              )}
            >
              {verification.action.label}
              <ChevronLeft size={16} />
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
