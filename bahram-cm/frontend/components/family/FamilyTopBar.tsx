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
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-white/10 bg-charcoal/95 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6 lg:py-3.5">
      <Link href="/family" className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-charcoal lg:h-10 lg:w-10">
          خ
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold text-bone lg:text-[15px]">خانواده داداش بهرام</p>
          {typeof memberCount === 'number' && (
            <p className="text-[11px] text-bone/50 lg:text-xs">{memberCount.toLocaleString('fa-IR')} عضو</p>
          )}
        </div>
      </Link>
      {isMember && <NotificationBell />}
    </header>
  );
}
