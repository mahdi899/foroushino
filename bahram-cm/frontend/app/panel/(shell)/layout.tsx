import { redirect } from 'next/navigation';
import { PanelShell } from '@/components/student-panel/layout/PanelShell';
import { getCurrentStudent } from '@/lib/student/session';

export default async function PanelShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentStudent();

  if (!user) {
    redirect('/panel/login');
  }

  return <PanelShell user={user}>{children}</PanelShell>;
}
