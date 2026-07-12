'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Camera, Loader2 } from 'lucide-react';
import { PanelProfileAvatar, hasUploadedProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { ProfileAvatarUploadSheet } from '@/components/student-panel/profile/ProfileAvatarUploadSheet';
import { type AccountTier } from '@/lib/student/accountTier';
import { studentDefaultAvatarUrl } from '@/lib/student/avatar';
import { getStudentDisplayName } from '@/lib/student/displayName';
import { uploadProfileAvatarAction } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';
import { usePanelAvatarCache } from '@/components/student-panel/layout/PanelAvatarCacheContext';
import { cn } from '@/lib/cn';

export function ProfileAvatarField({
  user,
  profileCompletion,
  accountTier,
}: {
  user: StudentUser;
  profileCompletion?: number;
  accountTier: AccountTier;
}) {
  const router = useRouter();
  const avatarCache = usePanelAvatarCache();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const displayName = getStudentDisplayName(user);
  const hasCustomAvatar = hasUploadedProfileAvatar(user.profile?.avatar, user.profile?.avatar_url);
  const identityVerified = accountTier.level >= 2;
  const verified = identityVerified;
  const verifiedLabel = 'هویت تأییدشده';

  async function onConfirm(file: File) {
    setPending(true);
    setError('');
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await uploadProfileAvatarAction(formData);
    setPending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSheetOpen(false);
    avatarCache?.bumpAvatarCache();
    router.refresh();
  }

  function handleOpenSheet() {
    setError('');
    setSheetOpen(true);
  }

  return (
    <>
      <div className="panel-profile-avatar panel-profile-avatar--aside">
        <button
          type="button"
          disabled={pending}
          onClick={handleOpenSheet}
          className="panel-profile-avatar__trigger group"
          aria-label={hasCustomAvatar ? 'تغییر تصویر پروفایل' : 'انتخاب تصویر پروفایل'}
        >
          <PanelProfileAvatar
            avatar={user.profile?.avatar}
            avatarUrl={user.profile?.avatar_url}
            avatarVersion={user.profile?.avatar_version}
            gravatarUrl={user.profile?.gravatar_url}
            defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id, 256)}
            alt={displayName}
            className="panel-profile-avatar__image panel-profile-avatar__image--aside !rounded-full !ring-0"
            verified={verified}
            verifiedLabel={verifiedLabel}
          />
          <span className="panel-profile-avatar__overlay">
            {pending ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-6 w-6" aria-hidden />
            )}
          </span>
        </button>

        <div className="panel-profile-avatar__meta">
          {accountTier.variant !== 'base' ? (
            <span
              className={cn(
                'panel-profile-avatar__badge',
                accountTier.variant === 'identity' && 'panel-profile-avatar__badge--tier-2',
                accountTier.variant === 'full' && 'panel-profile-avatar__badge--tier-3',
              )}
            >
              <BadgeCheck className="panel-profile-avatar__badge-icon" aria-hidden size={12} strokeWidth={2.5} />
              {accountTier.badge}
            </span>
          ) : null}
          <p className="panel-profile-avatar__name">{displayName}</p>
          <p className="panel-profile-avatar__mobile" dir="ltr">
            {user.mobile}
          </p>
        </div>

        {!hasCustomAvatar ? (
          <p className="panel-profile-avatar__hint panel-profile-avatar__hint--empty">
            هنوز عکسی نگذاشته‌اید — برای آپلود بزنید
          </p>
        ) : null}
      </div>

      <ProfileAvatarUploadSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        displayName={displayName}
        hasCustomAvatar={hasCustomAvatar}
        avatar={user.profile?.avatar}
        avatarUrl={user.profile?.avatar_url}
        gravatarUrl={user.profile?.gravatar_url}
        defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id, 192)}
        verified={verified}
        verifiedLabel={verifiedLabel}
        pending={pending}
        error={error}
        onConfirm={(file) => void onConfirm(file)}
      />
    </>
  );
}
