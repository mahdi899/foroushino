'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { commitStudentImport, previewStudentImport } from '../actions';

type PreviewRow = { line: number; mobile: string | null; name: string | null; product_id: number | null; status: string; errors: string[] };

export function ImportStudentsPanel() {
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function onPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPending(true);
    setError('');
    setMessage('');
    const formData = new FormData();
    formData.set('file', file);
    const res = await previewStudentImport(formData);
    setPending(false);
    if (res.ok) {
      setRows(res.rows as PreviewRow[]);
      setValidCount(res.valid_count);
      setErrorCount(res.error_count);
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function onCommit() {
    if (!file) return;
    setCommitting(true);
    setError('');
    const formData = new FormData();
    formData.set('file', file);
    const res = await commitStudentImport(formData);
    setCommitting(false);
    if (res.ok) {
      setMessage(`با موفقیت ثبت شد: ${res.valid_count} ردیف معتبر، ${res.error_count} خطا.`);
      setRows(null);
      setFile(null);
      formRef.current?.reset();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-2 text-h3 font-bold text-primary-dark">وارد کردن دانشجو از فایل CSV</h2>
        <p className="mb-4 text-caption text-text-muted">
          فایل باید ستون‌های <code dir="ltr">mobile</code>، <code dir="ltr">name</code> (اختیاری) و{' '}
          <code dir="ltr">product_id</code> (اختیاری — برای اعطای دسترسی دوره) داشته باشد. ابتدا پیش‌نمایش بگیرید، سپس ثبت نهایی کنید.
        </p>
        <form ref={formRef} onSubmit={onPreview} className="flex flex-wrap items-end gap-3">
          <input
            required
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="field-input"
          />
          <button type="submit" disabled={pending} className="btn btn-secondary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            پیش‌نمایش (Dry Run)
          </button>
        </form>
        {message && <p className="mt-3 text-small text-success">{message}</p>}
        {error && <p className="mt-3 text-small text-error">{error}</p>}
      </div>

      {rows && (
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-small">
              <span className="text-success">{validCount} ردیف معتبر</span> — <span className="text-error">{errorCount} خطا</span>
            </p>
            <button type="button" onClick={() => void onCommit()} disabled={committing || validCount === 0} className="btn btn-primary">
              {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ثبت نهایی {validCount} ردیف معتبر
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-right text-small">
              <thead>
                <tr className="border-b border-border bg-surface-soft/60 text-text-muted">
                  <th className="px-3 py-2">ردیف</th>
                  <th className="px-3 py-2">موبایل</th>
                  <th className="px-3 py-2">نام</th>
                  <th className="px-3 py-2">محصول</th>
                  <th className="px-3 py-2">وضعیت</th>
                  <th className="px-3 py-2">خطا</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.line} className={r.status === 'error' ? 'bg-error/5' : ''}>
                    <td className="px-3 py-2">{r.line}</td>
                    <td className="px-3 py-2" dir="ltr">{r.mobile ?? '—'}</td>
                    <td className="px-3 py-2">{r.name ?? '—'}</td>
                    <td className="px-3 py-2">{r.product_id ?? '—'}</td>
                    <td className="px-3 py-2">{r.status === 'ok' ? '✓' : '✗'}</td>
                    <td className="px-3 py-2 text-caption text-error">{r.errors.join('، ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
