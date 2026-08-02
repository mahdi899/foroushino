import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getStudent } from '@/lib/admin/academyData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { StudentDetailView } from '../StudentDetailView';

export const dynamic = 'force-dynamic';

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await getStudent(Number(id));
  if (!student) notFound();

  const user = await getCurrentUser();

  return (
    <AdminPage title={student.display_name} desc={student.mobile ?? student.email ?? ''} backHref="/admin/academy/students">
      <StudentDetailView
        student={student}
        canDeleteStudent={can(user, 'students.delete')}
      />
    </AdminPage>
  );
}
