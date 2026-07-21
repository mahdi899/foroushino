import type { Metadata } from 'next';
import { FileDown, Award } from 'lucide-react';
import { notFound } from 'next/navigation';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
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

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 404
  );
}

export default async function PanelSeminarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) {
    notFound();
  }

  let seminar: SeminarDetail;
  try {
    const res = await panelStudentFetch<{ data: SeminarDetail }>(`/seminars/${id}`);
    seminar = res.data;
  } catch (error) {
    if (isNotFound(error)) notFound();
    throw error;
  }

  const assets = seminar.assets ?? [];
  const certificates = seminar.certificates ?? [];

  return (
    <div className="panel-page-inner panel-page-inner--md flex flex-col gap-6">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-text">{seminar.title}</h1>
        {seminar.location ? <p className="mt-2 text-sm text-text-muted">{seminar.location}</p> : null}
        {seminar.description ? <p className="mt-4 text-sm leading-7 text-text">{seminar.description}</p> : null}
      </div>

      {assets.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold text-text">فایل‌ها و ضبط جلسات</h2>
          <ul className="flex flex-col divide-y divide-border">
            {assets.map((asset) => (
              <li key={asset.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-text">{asset.title}</span>
                <a href={asset.download_url} className="btn btn-secondary panel-text-meta">
                  <FileDown size={16} />
                  دریافت
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {certificates.length > 0 ? (
        <div className="card p-6">
          <h2 className="mb-4 text-base font-bold text-text">گواهی‌ها</h2>
          <ul className="flex flex-col divide-y divide-border">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 text-sm text-text">
                  <Award size={16} />
                  {cert.certificate_number ?? `گواهی #${cert.id}`}
                </span>
                {cert.download_url ? (
                  <a href={cert.download_url} className="btn btn-secondary panel-text-meta">
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
