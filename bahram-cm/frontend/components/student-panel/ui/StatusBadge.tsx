type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'gold' | 'teal';

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
  gold: 'badge-warning',
  teal: 'badge-success',
};

export function StatusBadge({
  children,
  variant = 'neutral',
  dot,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: 'blue' | 'green' | 'orange' | 'teal' | 'gold';
}) {
  return (
    <span className={`badge ${VARIANT_CLASS[variant]} inline-flex items-center gap-1.5`}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{
            background:
              dot === 'blue'
                ? 'var(--color-primary)'
                : dot === 'green'
                  ? '#34d399'
                  : dot === 'orange'
                    ? '#fb923c'
                    : dot === 'gold'
                      ? 'var(--color-gold)'
                      : 'var(--color-primary)',
          }}
        />
      ) : null}
      {children}
    </span>
  );
}
