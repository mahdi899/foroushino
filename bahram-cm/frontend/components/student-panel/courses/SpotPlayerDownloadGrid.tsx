import { siteStorageMedia } from '@/config/media';
import { cn } from '@/lib/cn';

const SPOTPLAYER_PLATFORM_ICON_BASE = 'https://app.spotplayer.ir/assets/img/platform';

const PLATFORMS: {
  id: string;
  label: string;
  logo: string;
  href?: string;
  comingSoon?: boolean;
}[] = [
  {
    id: 'windows',
    label: 'Windows',
    logo: siteStorageMedia('platform-windows.svg'),
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.exe',
  },
  {
    id: 'macos',
    label: 'MacOS',
    logo: `${SPOTPLAYER_PLATFORM_ICON_BASE}/mac.png`,
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.dmg',
  },
  {
    id: 'android',
    label: 'Android',
    logo: `${SPOTPLAYER_PLATFORM_ICON_BASE}/android.png`,
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.apk',
  },
  {
    id: 'web',
    label: 'Web',
    logo: `${SPOTPLAYER_PLATFORM_ICON_BASE}/web.png`,
    href: 'https://app.spotplayer.ir/',
  },
  {
    id: 'ios',
    label: 'iOS',
    logo: `${SPOTPLAYER_PLATFORM_ICON_BASE}/ios.png`,
    comingSoon: true,
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    logo: `${SPOTPLAYER_PLATFORM_ICON_BASE}/ubuntu.png`,
    comingSoon: true,
  },
];

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
        alt=""
        width={40}
        height={40}
        className={cn('h-10 w-10 shrink-0 object-contain', comingSoon && 'opacity-35 grayscale')}
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
      <h3 className="panel-card-title mb-2">دانلود SpotPlayer</h3>
      <div className="grid grid-cols-3 gap-0">
        {PLATFORMS.map((platform) => (
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
