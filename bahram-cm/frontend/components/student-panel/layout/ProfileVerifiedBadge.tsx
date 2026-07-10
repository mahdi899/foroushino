import { BadgeCheck } from 'lucide-react';

export function ProfileVerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      className={className}
      strokeWidth={2.25}
      aria-hidden
    />
  );
}
