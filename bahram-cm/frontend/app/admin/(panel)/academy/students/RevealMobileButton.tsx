'use client';

import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { revealStudentMobileAction } from '../identity-verifications/actions';

export function RevealMobileButton({
  studentId,
  masked,
  canReveal,
}: {
  studentId: number;
  masked: string | null;
  canReveal?: boolean;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const display = revealed ?? masked ?? '—';

  if (!canReveal) {
    return (
      <span dir="ltr" className="font-mono text-caption text-text-muted">
        {display}
      </span>
    );
  }

  if (revealed) {
    return (
      <span dir="ltr" className="font-mono text-caption text-danger">
        {revealed}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => {
          setRevealing(true);
          setError(null);
          void revealStudentMobileAction(studentId).then((res) => {
            setRevealing(false);
            if (res.ok) setRevealed(res.mobile);
            else setError(res.error);
          });
        }}
        disabled={revealing}
        className="inline-flex items-center gap-1 text-caption text-accent hover:text-primary"
      >
        {revealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
        <span dir="ltr">{masked ?? 'نمایش شماره'}</span>
      </button>
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}
