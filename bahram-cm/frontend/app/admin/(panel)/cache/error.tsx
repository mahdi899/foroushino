'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function CacheError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin/cache]', error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-warning" />
      <h1 className="text-h3 font-bold text-primary-dark">خطا در بارگذاری پنل کش</h1>
      <p className="max-w-md text-small text-text-muted">{error.message || 'خطای ناشناخته'}</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="btn btn-primary px-4 py-2 text-small">
          تلاش مجدد
        </button>
        <Link href="/admin" className="btn btn-secondary px-4 py-2 text-small">
          بازگشت به داشبورد
        </Link>
      </div>
    </div>
  );
}
