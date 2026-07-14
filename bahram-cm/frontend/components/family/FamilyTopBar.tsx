import Link from 'next/link';
import { NotificationBell } from '@/components/family/NotificationBell';

export function FamilyTopBar({
  isMember,
  memberCount,
}: {
  isMember: boolean;
  memberCount?: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-charcoal/90 px-4 py-3 backdrop-blur-md">
      <Link href="/family" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-bold text-charcoal">خ</span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-bone">خانواده داداش بهرام</p>
          {typeof memberCount === 'number' && (
            <p className="text-[11px] text-bone/50">{memberCount.toLocaleString('fa-IR')} عضو</p>
          )}
        </div>
      </Link>
      {isMember && <NotificationBell />}
    </header>
  );
}
