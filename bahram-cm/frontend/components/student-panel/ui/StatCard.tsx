import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type StatVariant = 'teal' | 'gold' | 'blue' | 'green';

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'teal',
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  variant?: StatVariant;
  hint?: string;
}) {
  return (
    <div className={`panel-stat-card panel-stat-card--${variant} p-3.5 transition-all duration-300 hover:scale-[1.02] sm:p-4`}>
      {Icon ? (
        <span className={`panel-stat-card__icon panel-stat-card__icon--${variant}`} aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
      ) : null}
      <div className="mt-2 sm:mt-3">{value}</div>
      <p className="panel-text-caption mt-1 text-text-muted">{label}</p>
      {hint ? <p className="panel-text-caption mt-1 text-text-subtle">{hint}</p> : null}
    </div>
  );
}
