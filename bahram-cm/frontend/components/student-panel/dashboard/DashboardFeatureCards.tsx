import Link from 'next/link';
import type { ReactNode } from 'react';
import { Briefcase, Crown, Gift, Play } from 'lucide-react';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

interface DashboardFeatureCardsProps {
  courseTitle: string | null;
  courseHref: string;
  referralAmount?: number;
  courseActive?: boolean;
}

function FeatureCard({
  href,
  variant,
  icon,
  eyebrow,
  title,
  description,
  cta,
  badge,
}: {
  href: string;
  variant: 'teal' | 'gold' | 'sat';
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  cta: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <Link href={href} className={`panel-feature-card panel-feature-card--${variant} group`}>
      <div className="panel-feature-card__main">
        <span className="panel-feature-card__icon">{icon}</span>
        <div className="panel-feature-card__content">
          <div className="panel-feature-card__meta">
            <p className="panel-feature-card__eyebrow">{eyebrow}</p>
            {badge}
          </div>
          <h3 className="panel-feature-card__title">{title}</h3>
          <p className="panel-feature-card__desc">{description}</p>
        </div>
      </div>
      <span className="panel-feature-card__cta">{cta}</span>
    </Link>
  );
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
    <div className="panel-feature-grid">
      <FeatureCard
        href={courseHref}
        variant="teal"
        icon={<Play size={22} className="fill-current" />}
        eyebrow="دوره فعال"
        title={courseTitle ?? 'مشاهده دوره‌ها'}
        description="تمام محتوای دوره از طریق SpotPlayer در دسترس است."
        badge={courseActive ? <StatusBadge variant="success">فعال</StatusBadge> : undefined}
        cta={
          <>
            <Play size={14} className="fill-current" />
            ورود به SpotPlayer
          </>
        }
      />

      <FeatureCard
        href="/panel/referrals"
        variant="gold"
        icon={<Crown size={22} />}
        eyebrow="باشگاه VIP"
        title={cashbackLabel}
        description="با هر معرفی موفق، پاداش نقدی دریافت کن."
        cta={
          <>
            <Gift size={14} />
            مشاهده باشگاه مشتریان
          </>
        }
      />

      <FeatureCard
        href="/panel/sat"
        variant="sat"
        icon={<Briefcase size={22} />}
        eyebrow="همکاری شغلی"
        title="ثبت درخواست سات"
        description="فرصت همکاری با آکادمی را از اینجا دنبال کن."
        cta="ثبت درخواست"
      />
    </div>
  );
}
