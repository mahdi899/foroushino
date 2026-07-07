'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateReferralConversionStatus } from '../actions';
import { REFERRAL_STATUS_LABELS } from '@/lib/admin/academyTypes';

export function ReferralStatusSelect({ id, initialStatus }: { id: number; initialStatus: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="field-input py-1 text-caption"
      defaultValue={initialStatus}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        startTransition(async () => {
          await updateReferralConversionStatus(id, value);
          router.refresh();
        });
      }}
    >
      {Object.entries(REFERRAL_STATUS_LABELS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}
