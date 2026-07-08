import { CalendarDays, MapPin, Video } from 'lucide-react';
import { StatCard } from '@/components/student-panel/ui/StatCard';

export function SeminarStatsRibbon({ total, recent }: { total: number; recent: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        variant="gold"
        icon={CalendarDays}
        value={total.toLocaleString('fa-IR')}
        label="سمینار ثبت‌نام‌شده"
        hint="کل رویدادهای شما"
      />
      <StatCard
        variant="teal"
        icon={Video}
        value={recent.toLocaleString('fa-IR')}
        label="سمینارهای اخیر"
        hint="۳۰ روز گذشته"
      />
      <StatCard
        variant="green"
        icon={MapPin}
        value="آنلاین / حضوری"
        label="نوع برگزاری"
        hint="بسته به هر سمینار"
      />
    </div>
  );
}
