'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportStudentsCsv } from '../actions';

export function StudentsExportButton({ search, status }: { search?: string; status?: string }) {
  const [pending, setPending] = useState(false);

  async function onExport() {
    setPending(true);
    const res = await exportStudentsCsv({
      search: search?.trim() || undefined,
      status: status || undefined,
    });
    setPending(false);

    if (!res.ok) {
      window.alert(res.error);
      return;
    }

    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={pending}
      className="btn btn-secondary shrink-0 text-small"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      خروجی اکسل
    </button>
  );
}
