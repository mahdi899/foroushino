type Props = {
  percent: number;
  label?: string;
};

export function IdentityUploadProgress({ percent, label = 'در حال بارگذاری…' }: Props) {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div
      className="panel-identity-upload-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safePercent}
      aria-label={label}
    >
      <div className="panel-identity-upload-progress__meta">
        <span className="panel-identity-upload-progress__label">{label}</span>
        <span className="panel-identity-upload-progress__value">{safePercent.toLocaleString('fa-IR')}٪</span>
      </div>
      <div className="panel-identity-upload-progress__track">
        <div className="panel-identity-upload-progress__bar" style={{ width: `${safePercent}%` }} />
      </div>
    </div>
  );
}
