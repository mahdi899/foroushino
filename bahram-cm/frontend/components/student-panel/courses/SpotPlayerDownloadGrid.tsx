import { cn } from '@/lib/cn';
import { SPOTPLAYER_DOWNLOADS } from '@/lib/spotplayer/downloads';

function PlatformTile({
  label,
  logo,
  href,
  comingSoon,
}: {
  label: string;
  logo: string;
  href?: string;
  comingSoon?: boolean;
}) {
  const body = (
    <>
      <img
        src={logo}
        alt={label}
        width={48}
        height={48}
        className={cn('h-12 w-12 shrink-0 object-contain', comingSoon && 'opacity-35 grayscale')}
        loading="lazy"
        decoding="async"
      />
      <span className={cn('panel-text-caption font-medium leading-tight', comingSoon ? 'text-text-muted/45' : 'text-text')}>
        {label}
      </span>
      {comingSoon ? <span className="panel-text-caption leading-none text-text-muted/40">به‌زودی</span> : null}
    </>
  );

  if (comingSoon || !href) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-1 text-center" aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-0.5 rounded-md py-1 text-center transition-colors hover:bg-surface-soft"
      title={`دانلود نسخه ${label}`}
    >
      {body}
    </a>
  );
}

export function SpotPlayerDownloadGrid() {
  return (
    <div className="card p-4">
      <h3 className="panel-card-title mb-1">دانلود نرم‌افزار SpotPlayer</h3>
      <p className="panel-text-caption mb-3 leading-relaxed text-text-muted">
        دوره را فقط در اپ ویندوز یا اندروید باز کنید؛ پخش آنلاین وب پشتیبانی نمی‌شود.
      </p>
      <div className="grid grid-cols-3 gap-0">
        {SPOTPLAYER_DOWNLOADS.map((platform) => (
          <PlatformTile
            key={platform.id}
            label={platform.label}
            logo={platform.logo}
            href={platform.href}
            comingSoon={platform.comingSoon}
          />
        ))}
      </div>
    </div>
  );
}
