'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { PanelProfileAvatar } from '@/components/student-panel/layout/PanelProfileAvatar';
import { studentDefaultAvatarUrl } from '@/lib/student/avatar';
import { uploadProfileAvatarAction } from '@/lib/student/panelActions';
import type { StudentUser } from '@/lib/student/session';

export function ProfileAvatarField({ user }: { user: StudentUser }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const fullName = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
  const displayName = fullName || user.name || 'دانشجو';
  const hasCustomAvatar = Boolean(user.profile?.avatar_url);

  async function onPick(file: File | undefined) {
    if (!file) return;
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
    router.refresh();
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="panel-profile-avatar">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />

      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="panel-profile-avatar__trigger group"
        aria-label={hasCustomAvatar ? 'تغییر تصویر پروفایل' : 'انتخاب تصویر پروفایل'}
      >
        <PanelProfileAvatar
          avatar={user.profile?.avatar}
          avatarUrl={user.profile?.avatar_url}
          gravatarUrl={user.profile?.gravatar_url}
          defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id, 192)}
          alt={displayName}
          className="panel-profile-avatar__image !h-28 !w-28 sm:!h-32 sm:!w-32 !rounded-2xl !ring-0"
        />
        <span className="panel-profile-avatar__overlay">
          {pending ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-6 w-6" aria-hidden />
          )}
        </span>
      </button>

      <div className="panel-profile-avatar__copy">
        <span className="panel-profile-avatar__badge">دانشجو</span>
        <p className="panel-profile-avatar__name">{displayName}</p>
        <p className="panel-profile-avatar__mobile" dir="ltr">
          {user.mobile}
        </p>
        <p className="panel-profile-avatar__hint">
          {hasCustomAvatar ? 'برای تغییر، روی تصویر بزنید' : 'برای آپلود، روی تصویر بزنید'}
        </p>
        <p className="panel-profile-avatar__formats">JPG، PNG یا WebP — حداکثر ۲ مگابایت</p>
        {error ? <p className="panel-profile-avatar__error">{error}</p> : null}
      </div>
    </div>
  );
}
