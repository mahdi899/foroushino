import { siteStorageMedia } from '@/config/media';

export type SpotPlayerDownloadPlatform = {
  id: 'windows' | 'macos' | 'android' | 'ios' | 'ubuntu';
  label: string;
  logo: string;
  href?: string;
  comingSoon?: boolean;
};

/** Official SpotPlayer native app installers — not the web player. */
export const SPOTPLAYER_DOWNLOADS: SpotPlayerDownloadPlatform[] = [
  {
    id: 'windows',
    label: 'Windows',
    logo: siteStorageMedia('platform-windows.png'),
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.exe',
  },
  {
    id: 'android',
    label: 'Android',
    logo: siteStorageMedia('platform-android.png'),
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.apk',
  },
  {
    id: 'macos',
    label: 'MacOS',
    logo: siteStorageMedia('platform-macos.png'),
    href: 'https://app.spotplayer.ir/assets/bin/spotplayer/setup.dmg',
  },
  {
    id: 'ios',
    label: 'iOS',
    logo: siteStorageMedia('platform-ios.png'),
    comingSoon: true,
  },
  {
    id: 'ubuntu',
    label: 'Ubuntu',
    logo: siteStorageMedia('platform-ubuntu.png'),
    comingSoon: true,
  },
];

export const SPOTPLAYER_PRIMARY_DOWNLOADS = SPOTPLAYER_DOWNLOADS.filter(
  (platform): platform is SpotPlayerDownloadPlatform & { href: string } =>
    Boolean(platform.href) && (platform.id === 'windows' || platform.id === 'android'),
);
