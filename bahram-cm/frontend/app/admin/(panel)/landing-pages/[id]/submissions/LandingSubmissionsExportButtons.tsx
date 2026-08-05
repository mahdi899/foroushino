'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportLandingSubmissions } from '../../actions';

export function LandingSubmissionsExportButtons({ landingPageId }: { landingPageId: number }) {
  const [pending, setPending] = useState<'csv' | 'xlsx' | null>(null);

  async function onExport(format: 'csv' | 'xlsx') {
    setPending(format);
    const res = await exportLandingSubmissions(landingPageId, format);
    setPending(null);

    if (!res.ok) {
      window.alert(res.error);
      return;
    }

    const url = URL.createObjectURL(res.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = res.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void onExport('xlsx')}
        disabled={pending !== null}
        className="btn btn-secondary shrink-0 text-small"
      >
        {pending === 'xlsx' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        خروجی اکسل
      </button>
      <button
        type="button"
        onClick={() => void onExport('csv')}
        disabled={pending !== null}
        className="btn btn-secondary shrink-0 text-small"
      >
        {pending === 'csv' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        خروجی CSV
      </button>
    </div>
  );
}
