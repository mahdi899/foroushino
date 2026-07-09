import { Calendar, KeyRound, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

export function CourseMetaCard({
  purchaseDate,
  isActive,
  accessType = 'دسترسی دائمی',
}: {
  purchaseDate: string;
  isActive: boolean;
  accessType?: string;
}) {
  const items: {
    icon: typeof Calendar;
    label: string;
    value: string;
    highlight?: boolean;
  }[] = [
    { icon: Calendar, label: 'تاریخ خرید', value: purchaseDate },
    { icon: ShieldCheck, label: 'وضعیت دوره', value: isActive ? 'دسترسی فعال' : 'غیرفعال', highlight: isActive },
    { icon: KeyRound, label: 'نوع دسترسی', value: accessType },
  ];

  return (
    <div className="card flex flex-row flex-wrap items-stretch justify-between gap-4 p-4 lg:w-auto">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-4">
          {index > 0 ? <div className="hidden h-8 w-px bg-border/60 sm:block" /> : null}
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <item.icon size={15} />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="panel-text-caption text-text-subtle">{item.label}</span>
              {item.label === 'وضعیت دوره' ? (
                <StatusBadge variant={isActive ? 'success' : 'neutral'}>{item.value}</StatusBadge>
              ) : (
                <span className={`panel-text-body font-bold ${item.highlight === false ? 'text-text-muted' : 'text-text'}`}>
                  {item.value}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
