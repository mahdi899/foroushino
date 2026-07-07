import type { Metadata } from 'next';
import { FileDown, Award } from 'lucide-react';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'جزئیات سمینار | پنل کاربری', robots: { index: false, follow: false } };

interface SeminarDetail {
  id: number;
  title: string;
  date: string | null;
  location: string | null;
  description: string | null;
  assets: { id: number; title: string; type: string; download_url: string }[];
  certificates: { id: number; certificate_number: string | null; issued_at: string | null; download_url: string | null }[];
}

export default async function PanelSeminarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: seminar } = await studentFetch<{ data: SeminarDetail }>(`/seminars/${id}`);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-text">{seminar.title}</h1>
        {seminar.location ? <p className="mt-2 text-sm text-text-muted">{seminar.location}</p> : null}
        {seminar.description ? <p className="mt-4 text-sm leading-7 text-text">{seminar.description}</p> : null}
      </div>

      {seminar.assets.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold text-text">فایل‌ها و ضبط جلسات</h2>
          <ul className="flex flex-col divide-y divide-border">
            {seminar.assets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-text">{asset.title}</span>
                <a href={asset.download_url} className="btn btn-secondary text-xs">
                  <FileDown size={16} />
                  دریافت
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {seminar.certificates.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold text-text">گواهی‌ها</h2>
          <ul className="flex flex-col divide-y divide-border">
            {seminar.certificates.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 text-sm text-text">
                  <Award size={16} />
                  {cert.certificate_number ?? `گواهی #${cert.id}`}
                </span>
                {cert.download_url ? (
                  <a href={cert.download_url} className="btn btn-secondary text-xs">
                    <FileDown size={16} />
                    دریافت
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
