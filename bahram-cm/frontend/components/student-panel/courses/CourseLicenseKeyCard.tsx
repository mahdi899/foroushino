'use client';

import { KeyRound } from 'lucide-react';
import { CopyTextButton } from '@/components/student-panel/ui/CopyTextButton';

export function CourseLicenseKeyCard({ licenseKey }: { licenseKey: string | null | undefined }) {
  if (!licenseKey?.trim()) return null;

  return (
    <div className="border-t border-border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <KeyRound size={15} />
          </span>
          <div className="min-w-0">
            <h3 className="panel-card-title">توکن لایسنس SpotPlayer</h3>
            <p className="panel-text-meta text-text-muted">برای ورود در اپلیکیشن SpotPlayer</p>
          </div>
        </div>
        <CopyTextButton value={licenseKey} label="کپی توکن" showValue={false} className="shrink-0" />
      </div>
    </div>
  );
}
