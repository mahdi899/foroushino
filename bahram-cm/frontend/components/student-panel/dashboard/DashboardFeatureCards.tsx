import Link from 'next/link';
import { Briefcase, Crown, Gift, Play } from 'lucide-react';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

interface DashboardFeatureCardsProps {
  courseTitle: string | null;
  courseHref: string;
  referralAmount?: number;
  courseActive?: boolean;
}

export function DashboardFeatureCards({
  courseTitle,
  courseHref,
  referralAmount,
  courseActive = true,
}: DashboardFeatureCardsProps) {
  const cashbackLabel =
    referralAmount && referralAmount > 0
      ? `${referralAmount.toLocaleString('fa-IR')} تومان کش‌بک`
      : 'کش‌بک بر اساس محصول';

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Link href={courseHref} className="panel-feature-card panel-feature-card--teal group transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-start justify-between gap-2">
          <span className="panel-feature-card__icon">
            <Play size={22} className="fill-current" />
          </span>
          {courseActive ? <StatusBadge variant="success">فعال</StatusBadge> : null}
        </div>
        <div className="mt-auto">
          <p className="text-[11px] font-medium opacity-80">دوره فعال</p>
          <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug">
            {courseTitle ?? 'مشاهده دوره‌ها'}
          </h3>
          <p className="mt-2 text-[10px] leading-relaxed opacity-75">
            تمام محتوای دوره از طریق SpotPlayer در دسترس است.
          </p>
          <span className="panel-feature-card__cta mt-4">
            <Play size={14} className="fill-current" />
            ورود به SpotPlayer
          </span>
        </div>
      </Link>

      <Link href="/panel/referrals" className="panel-feature-card panel-feature-card--gold group transition-all duration-300 hover:scale-[1.02]">
        <span className="panel-feature-card__icon">
          <Crown size={22} />
        </span>
        <div className="mt-auto">
          <p className="text-[11px] font-medium opacity-80">باشگاه VIP</p>
          <h3 className="mt-1 text-sm font-bold leading-snug">{cashbackLabel}</h3>
          <p className="mt-2 text-[10px] leading-relaxed opacity-75">
            با هر معرفی موفق، پاداش نقدی دریافت کن.
          </p>
          <span className="panel-feature-card__cta mt-4">
            <Gift size={14} />
            مشاهده باشگاه مشتریان
          </span>
        </div>
      </Link>

      <Link href="/panel/sat" className="panel-feature-card panel-feature-card--sat group transition-all duration-300 hover:scale-[1.02]">
        <span className="panel-feature-card__icon">
          <Briefcase size={22} />
        </span>
        <div className="mt-auto">
          <p className="text-[11px] font-medium opacity-80">همکاری شغلی</p>
          <h3 className="mt-1 text-sm font-bold leading-snug">ثبت درخواست سات</h3>
          <p className="mt-2 text-[10px] leading-relaxed opacity-75">
            فرصت همکاری با آکادمی را از اینجا دنبال کن.
          </p>
          <span className="panel-feature-card__cta mt-4">ثبت درخواست</span>
        </div>
      </Link>
    </div>
  );
}
