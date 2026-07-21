'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Link2, Trash2, Upload } from 'lucide-react';
import { deleteSeminarAsset, uploadSeminarAsset } from '../actions';
import type { AdminSeminarDetail } from '@/lib/admin/academyTypes';

type AssetSource = 'file' | 'link';

export function SeminarAssetsPanel({ seminar }: { seminar: AdminSeminarDetail }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState<AssetSource>('file');

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    const formData = new FormData(e.currentTarget);

    if (source === 'link') {
      formData.delete('file');
      formData.set('type', 'video');
      formData.delete('is_downloadable');
      const url = String(formData.get('external_url') ?? '').trim();
      if (!url) {
        setPending(false);
        setError('لینک ویدیو را وارد کنید.');
        return;
      }
      formData.set('external_url', url);
    } else {
      formData.delete('external_url');
      if (!formData.get('file') || !(formData.get('file') instanceof File) || !(formData.get('file') as File).size) {
        setPending(false);
        setError('فایل را انتخاب کنید.');
        return;
      }
    }

    const res = await uploadSeminarAsset(seminar.id, formData);
    setPending(false);
    if (res.ok) {
      formRef.current?.reset();
      setSource('file');
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
        <select required name="type" className="field-input" disabled={source === 'link'} defaultValue="video">
          <option value="video">ویدیو</option>
          <option value="file">فایل</option>
        </select>
        {source === 'file' ? (
          <label className="flex items-center gap-2 text-caption">
            <input type="checkbox" name="is_downloadable" value="1" /> قابل دانلود
          </label>
        ) : (
          <div className="flex items-center text-caption text-text-muted">لینک خارجی</div>
        )}

        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button
            type="button"
            onClick={() => setSource('file')}
            className={`btn ${source === 'file' ? 'btn-secondary' : 'btn-ghost'}`}
          >
            <Upload className="h-4 w-4" />
            آپلود فایل
          </button>
          <button
            type="button"
            onClick={() => setSource('link')}
            className={`btn ${source === 'link' ? 'btn-secondary' : 'btn-ghost'}`}
          >
            <Link2 className="h-4 w-4" />
            لینک ویدیو
          </button>
        </div>

        {source === 'file' ? (
          <input required={source === 'file'} type="file" name="file" className="field-input md:col-span-3" />
        ) : (
          <input
            required={source === 'link'}
            type="url"
            name="external_url"
            placeholder="https://… لینک ویدیو"
            dir="ltr"
            className="field-input md:col-span-3"
          />
        )}
        <button type="submit" disabled={pending} className="btn btn-secondary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : source === 'link' ? <Link2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
          {source === 'link' ? 'افزودن لینک' : 'بارگذاری'}
        </button>
      </form>
      {error && <p className="mb-3 text-small text-error">{error}</p>}

      {seminar.assets.length > 0 ? (
        <ul className="divide-y divide-border text-small">
          {seminar.assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2">
                {asset.title}{' '}
                <span className="text-caption text-text-muted">
                  ({asset.type}
                  {asset.is_downloadable ? '، قابل دانلود' : ''}
                  {asset.external_url ? '، لینک' : ''})
                </span>
                {asset.external_url ? (
                  <a
                    href={asset.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                    title="باز کردن لینک"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </span>
              <button type="button" onClick={() => void onDelete(asset.id)} className="text-danger hover:text-danger/80">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-text-muted">فایل یا لینکی ثبت نشده است.</p>
      )}
    </div>
  );
}
