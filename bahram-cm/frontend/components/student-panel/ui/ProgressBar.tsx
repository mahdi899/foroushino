export function ProgressBar({
  value,
  label,
  sublabel,
}: {
  value: number;
  label?: string;
  sublabel?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div>
      {label || sublabel ? (
        <div className="panel-text-meta mb-2 flex items-center justify-between text-text-muted">
          {label ? <span>{label}</span> : <span />}
          {sublabel ? <span>{sublabel}</span> : null}
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
        <div
          className="h-full rounded-full bg-primary shadow-glow transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
