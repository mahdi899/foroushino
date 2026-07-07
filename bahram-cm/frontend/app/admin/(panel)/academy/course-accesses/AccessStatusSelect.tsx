'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateCourseAccessStatus } from '../actions';
import { COURSE_ACCESS_STATUS_LABELS } from '@/lib/admin/academyTypes';

export function AccessStatusSelect({ accessId, initialStatus }: { accessId: number; initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();

  return (
    <select
      className="field-input py-1 text-caption"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        setStatus(value);
        startTransition(async () => {
          await updateCourseAccessStatus(accessId, value);
          router.refresh();
        });
      }}
    >
      {Object.entries(COURSE_ACCESS_STATUS_LABELS).map(([k, v]) => (
        <option key={k} value={k}>{v}</option>
      ))}
    </select>
  );
}
