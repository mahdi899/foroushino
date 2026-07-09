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
    <div className={`panel-stat-card panel-stat-card--${variant} p-3.5 sm:p-4 transition-all duration-300 hover:scale-[1.02]`}>
      {Icon ? <Icon size={18} className="text-primary" style={variant === 'gold' ? { color: 'var(--color-gold)' } : undefined} /> : null}
      <div className="mt-2 sm:mt-3">{value}</div>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
      {hint ? <p className="mt-1 text-[10px] text-text-subtle">{hint}</p> : null}
    </div>
  );
}
