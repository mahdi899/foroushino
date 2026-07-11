import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ProfileCardHead({
  icon: Icon,
  title,
  badge,
  badgeTone = 'gold',
  iconTone = 'primary',
}: {
  icon: LucideIcon;
  title: string;
  badge?: string;
  badgeTone?: 'gold' | 'pending';
  iconTone?: 'primary' | 'gold';
}) {
  return (
    <div className="panel-profile-card-head">
      <span
        className={cn('panel-profile-card-head__icon', `panel-profile-card-head__icon--${iconTone}`)}
        aria-hidden
      >
        <Icon size={16} strokeWidth={2} />
      </span>
      <h2 className="panel-profile-card-head__title">{title}</h2>
      {badge ? (
        <span
          className={cn(
            'panel-profile-card-head__badge',
            badgeTone === 'pending' && 'panel-profile-card-head__badge--pending',
          )}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
