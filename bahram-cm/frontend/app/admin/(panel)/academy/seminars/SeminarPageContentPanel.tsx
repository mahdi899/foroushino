'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { CoverImageField } from '@/app/admin/(panel)/content/CoverImageField';
import { updateSeminar } from '../actions';
import type { AdminSeminarDetail } from '@/lib/admin/academyTypes';

type SeminarPageContentPanelProps = {
  seminar: AdminSeminarDetail;
};

export function SeminarPageContentPanel({ seminar }: SeminarPageContentPanelProps) {
  const router = useRouter();
  const [description, setDescription] = useState(seminar.description ?? '');
  const [coverImage, setCoverImage] = useState(seminar.cover_image ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const res = await updateSeminar(seminar.id, {
      description: description || null,
      cover_image: coverImage || null,
    });

    setPending(false);
    if (res.ok) {
      setMessage('صفحه سمینار ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">صفحه عمومی سمینار</h2>
        <p className="mt-1 text-small text-text-muted">
          توضیحات و تصویر شاخص صفحه‌ای که کاربر پس از کلیک روی بنر می‌بیند.
        </p>
        {seminar.status === 'published' ? (
          <p className="mt-2 text-small">
            لینک عمومی:{' '}
            <Link href={`/seminars/${seminar.slug}`} className="text-primary hover:underline" target="_blank">
              /seminars/{seminar.slug}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-caption text-text-muted">پس از انتشار سمینار، این صفحه برای عموم قابل مشاهده است.</p>
        )}
      </div>

      <CoverImageField
        label="تصویر شاخص صفحه سمینار"
        value={coverImage}
        onChange={setCoverImage}
        alt={seminar.title}
      />

      <label>
        <span className="field-label">توضیحات سمینار</span>
        <textarea
          rows={10}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="field-input min-h-[12rem] resize-y"
          placeholder="معرفی سمینار، سرفصل‌ها، مخاطبان هدف و…"
        />
        <span className="mt-1 block text-caption text-text-muted">می‌توانید از HTML ساده (مثل p، strong، ul) استفاده کنید.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره صفحه
        </button>
        {message && <p className="text-small text-success">{message}</p>}
        {error && <p className="text-small text-error">{error}</p>}
      </div>
    </form>
  );
}
