'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminSatApplication } from '@/lib/admin/academyTypes';

export function SatSyncStatus({ application }: { application: AdminSatApplication }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (application.status !== 'accepted') {
    return <span className="text-caption text-muted">—</span>;
  }

  if (application.synced_to_sat_at) {
    return <span className="text-caption text-success">ارسال شد</span>;
  }

  async function resync() {
    const res = await fetch(`/api/admin/sat-applications/${application.id}/resync`, { method: 'POST' });
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-1">
      <span className="block text-caption text-error">ارسال نشده</span>
      {application.sat_sync_error ? (
        <span className="block text-caption text-muted">{application.sat_sync_error}</span>
      ) : null}
      <button type="button" className="text-caption text-primary hover:underline" disabled={pending} onClick={resync}>
        تلاش مجدد
      </button>
    </div>
  );
}
