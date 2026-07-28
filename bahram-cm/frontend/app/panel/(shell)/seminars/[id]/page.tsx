import type { Metadata } from 'next';
import { Award, CalendarDays, FileDown } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import {
  SeminarVideoGallery,
  type SeminarVideoAsset,
} from '@/components/student-panel/seminars/SeminarVideoGallery';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'جزئیات سمینار | پنل کاربری', robots: { index: false, follow: false } };

interface SeminarDetail {
  id: number;
  title: string;
  date: string | null;
  location: string | null;
  description: string | null;
  assets: SeminarVideoAsset[];
  certificates: {
    id: number;
    certificate_number: string | null;
    issued_at: string | null;
    download_url: string | null;
  }[];
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
  const metaBits = [
    seminar.location,
    seminar.date ? new Date(seminar.date).toLocaleDateString('fa-IR') : null,
  ].filter(Boolean);

  return (
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={CalendarDays}
        title={seminar.title}
        description={metaBits.length > 0 ? metaBits.join(' · ') : 'ویدیوها و گواهی‌های سمینار'}
      />

      <SeminarVideoGallery assets={assets} seminarTitle={seminar.title} />

      {certificates.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="border-b border-border/60 p-4">
            <h2 className="panel-card-title flex items-center gap-2">
              <Award size={16} className="text-primary" />
              گواهی‌ها
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {certificates.map((cert) => (
              <li key={cert.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-text">
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
