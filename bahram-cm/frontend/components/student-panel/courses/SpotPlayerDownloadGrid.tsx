import type { ComponentType } from 'react';
import { cn } from '@/lib/cn';
import {
  AndroidLogo,
  AppleLogo,
  IosLogo,
  UbuntuLogo,
  WebLogo,
  WindowsLogo,
} from '@/components/student-panel/courses/PlatformBrandIcons';

type PlatformIcon = ComponentType<{ className?: string; muted?: boolean }>;

const PLATFORMS: {
  id: string;
  label: string;
  Icon: PlatformIcon;
  href?: string;
  comingSoon?: boolean;
}[] = [
  {
    id: 'windows',
    label: 'Windows',
    Icon: WindowsLogo,
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.exe',
  },
  {
    id: 'macos',
    label: 'MacOS',
    Icon: AppleLogo,
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.dmg',
  },
  {
    id: 'android',
    label: 'Android',
    Icon: AndroidLogo,
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.apk',
  },
  {
    id: 'web',
    label: 'Web',
    Icon: WebLogo,
    href: 'https://app.spotplayer.ir/',
  },
  {
    id: 'ios',
    label: 'iOS',
    Icon: IosLogo,
    comingSoon: true,
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    Icon: UbuntuLogo,
    comingSoon: true,
  },
];

function PlatformTile({
  label,
  Icon,
  href,
  comingSoon,
}: {
  label: string;
  Icon: PlatformIcon;
  href?: string;
  comingSoon?: boolean;
}) {
  const body = (
    <>
      <Icon
        className={cn('h-10 w-10 shrink-0', comingSoon && 'text-text-muted/35')}
        muted={comingSoon}
      />
      <span className={cn('text-[10px] font-medium leading-tight', comingSoon ? 'text-text-muted/45' : 'text-text')}>
        {label}
      </span>
      {comingSoon ? <span className="text-[9px] leading-none text-text-muted/40">به‌زودی</span> : null}
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
      <h3 className="mb-2 text-sm font-bold text-text">دانلود SpotPlayer</h3>
      <div className="grid grid-cols-3 gap-0">
        {PLATFORMS.map((platform) => (
          <PlatformTile
            key={platform.id}
            label={platform.label}
            Icon={platform.Icon}
            href={platform.href}
            comingSoon={platform.comingSoon}
          />
        ))}
      </div>
    </div>
  );
}
