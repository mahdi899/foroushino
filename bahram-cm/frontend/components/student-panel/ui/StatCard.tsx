import type { LucideIcon } from 'lucide-react';

type StatVariant = 'teal' | 'gold' | 'blue' | 'green';

export function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'teal',
  hint,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  variant?: StatVariant;
  hint?: string;
}) {
  return (
    <div className={`panel-stat-card panel-stat-card--${variant} p-3.5 sm:p-4 transition-all duration-300 hover:scale-[1.02]`}>
      {Icon ? <Icon size={18} className="text-primary" style={variant === 'gold' ? { color: 'var(--color-gold)' } : undefined} /> : null}
      <p className="mt-2 text-xl font-bold text-text sm:mt-3 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
      {hint ? <p className="mt-1 text-[10px] text-text-subtle">{hint}</p> : null}
    </div>
  );
}
