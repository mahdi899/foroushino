'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, Upload } from 'lucide-react';
import { deleteSeminarAsset, uploadSeminarAsset } from '../actions';
import type { AdminSeminarDetail } from '@/lib/admin/academyTypes';

export function SeminarAssetsPanel({ seminar }: { seminar: AdminSeminarDetail }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const res = await uploadSeminarAsset(seminar.id, formData);
    setPending(false);
    if (res.ok) {
      formRef.current?.reset();
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  async function onDelete(assetId: number) {
    await deleteSeminarAsset(seminar.id, assetId);
    router.refresh();
  }

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-h3 font-bold text-primary-dark">فایل‌ها و ویدیوها (تحویل امن)</h2>
      <form ref={formRef} onSubmit={onUpload} className="mb-4 grid gap-3 md:grid-cols-4">
        <input required name="title" placeholder="عنوان فایل" className="field-input md:col-span-2" />
        <select required name="type" className="field-input">
          <option value="video">ویدیو</option>
          <option value="file">فایل</option>
        </select>
        <label className="flex items-center gap-2 text-caption">
          <input type="checkbox" name="is_downloadable" value="1" /> قابل دانلود
        </label>
        <input required type="file" name="file" className="field-input md:col-span-3" />
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          بارگذاری
        </button>
      </form>
      {error && <p className="mb-3 text-small text-error">{error}</p>}

      {seminar.assets.length > 0 ? (
        <ul className="divide-y divide-border text-small">
          {seminar.assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between py-2">
              <span>{asset.title} <span className="text-caption text-text-muted">({asset.type}{asset.is_downloadable ? '، قابل دانلود' : ''})</span></span>
              <button type="button" onClick={() => void onDelete(asset.id)} className="text-danger hover:text-danger/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-text-muted">فایلی بارگذاری نشده است.</p>
      )}
    </div>
  );
}
