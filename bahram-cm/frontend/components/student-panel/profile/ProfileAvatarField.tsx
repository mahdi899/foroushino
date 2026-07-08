'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
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
  const displayName = fullName || user.name;

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <PanelProfileAvatar
        avatar={user.profile?.avatar}
        avatarUrl={user.profile?.avatar_url}
        gravatarUrl={user.profile?.gravatar_url}
        defaultAvatarUrl={user.profile?.default_avatar_url ?? studentDefaultAvatarUrl(user.id, 128)}
        alt={displayName}
        className="h-16 w-16"
      />
      <div className="min-w-0">
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
          className="btn btn-secondary px-3 py-1.5 text-caption"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {user.profile?.avatar_url ? 'تغییر تصویر پروفایل' : 'انتخاب تصویر پروفایل'}
        </button>
        <p className="mt-1.5 text-xs text-text-muted">JPG، PNG یا WebP — حداکثر ۲ مگابایت</p>
        {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
      </div>
    </div>
  );
}
