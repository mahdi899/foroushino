'use client';

import { useEffect, useMemo, useState } from 'react';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/cn';
import { ProfileVerifiedBadge } from '@/components/student-panel/layout/ProfileVerifiedBadge';
import { usePanelAvatarCache } from '@/components/student-panel/layout/PanelAvatarCacheContext';
import { appendAvatarCacheBuster, resolveAvatarVersion } from '@/lib/student/avatarCache';

type Props = {
  avatar?: string | null;
  avatarUrl?: string | null;
  avatarVersion?: number | null;
  gravatarUrl?: string | null;
  defaultAvatarUrl?: string | null;
  alt: string;
  className?: string;
  verified?: boolean;
  verifiedLabel?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  return name.trim().slice(0, 2).toUpperCase() || '؟';
}

function buildAvatarSources({
  avatar,
  avatarUrl,
  defaultAvatarUrl,
  avatarVersion,
}: Pick<Props, 'avatar' | 'avatarUrl' | 'defaultAvatarUrl' | 'avatarVersion'>): string[] {
  const sources: string[] = [];

  const custom = avatarUrl?.trim() || avatar?.trim();
  if (custom) {
    const resolved = primarySiteImageSrc(custom) || custom;
    sources.push(appendAvatarCacheBuster(resolved, avatarVersion));
  }

  const fallback = defaultAvatarUrl?.trim();
  if (fallback) {
    sources.push(fallback);
  }

  return sources;
}

export function hasUploadedProfileAvatar(avatar?: string | null, avatarUrl?: string | null): boolean {
  return Boolean(avatarUrl?.trim() || avatar?.trim());
}

export function PanelProfileAvatar({
  avatar,
  avatarUrl,
  avatarVersion,
  gravatarUrl,
  defaultAvatarUrl,
  alt,
  className,
  verified = false,
  verifiedLabel = 'پروفایل تکمیل‌شده',
}: Props) {
  const avatarCache = usePanelAvatarCache();
  const resolvedVersion = resolveAvatarVersion(avatarVersion, avatarCache?.cacheBuster ?? null);

  const sources = useMemo(
    () => buildAvatarSources({ avatar, avatarUrl, defaultAvatarUrl, avatarVersion: resolvedVersion }),
    [avatar, avatarUrl, defaultAvatarUrl, resolvedVersion],
  );

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSrc = sources[sourceIndex];
  const showImage = Boolean(currentSrc);
  const initials = initialsFromName(alt);
  const hasCustomAvatar = hasUploadedProfileAvatar(avatar, avatarUrl);
  const isSquircle = className?.includes('rounded-2xl');
  const showPremiumRing = hasCustomAvatar;
  const showFrame = showPremiumRing || verified;

  const avatarNode = (
    <div
      className={cn(
        'panel-profile-avatar__inner h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-soft',
        !hasCustomAvatar && 'ring-2 ring-border/80',
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={currentSrc}
          src={currentSrc}
          alt={alt}
          className="h-full w-full object-cover object-center"
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 panel-text-meta font-bold text-primary" aria-hidden>
          {initials}
        </div>
      )}
    </div>
  );

  if (!showFrame) {
    return avatarNode;
  }

  return (
    <div
      className={cn(
        'panel-profile-avatar-halo',
        isSquircle && 'panel-profile-avatar-halo--squircle',
        !showPremiumRing && 'panel-profile-avatar-halo--plain',
      )}
    >
      {showPremiumRing ? <span className="panel-profile-avatar-halo__ring" aria-hidden /> : null}
      {avatarNode}
      {verified ? (
        <span className="panel-profile-avatar__verified" title={verifiedLabel} aria-label={verifiedLabel}>
          <ProfileVerifiedBadge />
        </span>
      ) : null}
    </div>
  );
}
