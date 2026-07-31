'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { StudentUser } from '@/lib/student/session';
import { isIdentityVerified } from '@/lib/student/accountTier';

const REF_CHANNEL_PATH = '/panel/reference-channel';

function storageKey(userId: number): string {
  return `panel:refch-post-identity:${userId}`;
}

function isMarked(userId: number): boolean {
  try {
    return localStorage.getItem(storageKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markDone(userId: number): void {
  try {
    localStorage.setItem(storageKey(userId), '1');
  } catch {
    /* ignore */
  }
}

export function ReferenceChannelPostIdentityRedirect({ user }: { user: StudentUser }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user.has_reference_channel || !isIdentityVerified(user)) return;

    const onReferenceChannel =
      pathname === REF_CHANNEL_PATH || pathname.startsWith(`${REF_CHANNEL_PATH}/`);

    if (onReferenceChannel) {
      markDone(user.id);
      return;
    }

    if (isMarked(user.id)) return;

    markDone(user.id);
    router.replace(REF_CHANNEL_PATH);
  }, [user, pathname, router]);

  return null;
}
