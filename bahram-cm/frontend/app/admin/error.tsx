'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-bg p-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-h3 text-primary-dark">خطا در پنل مدیریت</h1>
        <p className="mt-2 text-small text-text-muted">بارگذاری این بخش ناموفق بود.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">تلاش مجدد</button>
          <Link href="/admin" className="btn btn-secondary">بازگشت به داشبورد</Link>
        </div>
      </div>
    </div>
  );
}
