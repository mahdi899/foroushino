import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getSeminar } from '@/lib/admin/academyData';
import { formatDateTime } from '@/lib/admin/academyTypes';
import { SeminarAttendeesPanel } from '../SeminarAttendeesPanel';
import { SeminarAssetsPanel } from '../SeminarAssetsPanel';
import { SeminarCertificatesPanel } from '../SeminarCertificatesPanel';
import { SeminarPageContentPanel } from '../SeminarPageContentPanel';
import { SeminarSettingsPanel } from '../SeminarSettingsPanel';

export const dynamic = 'force-dynamic';

export default async function SeminarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seminar = await getSeminar(Number(id));
  if (!seminar) notFound();

  return (
    <AdminPage title={seminar.title} desc={`${formatDateTime(seminar.date)} — ${seminar.location ?? ''}`} backHref="/admin/academy/seminars">
      <div className="space-y-6">
        <SeminarPageContentPanel seminar={seminar} />
        <SeminarSettingsPanel seminar={seminar} />
        <SeminarAttendeesPanel seminar={seminar} />
        <SeminarAssetsPanel seminar={seminar} />
        <SeminarCertificatesPanel seminar={seminar} />
      </div>
    </AdminPage>
  );
}
