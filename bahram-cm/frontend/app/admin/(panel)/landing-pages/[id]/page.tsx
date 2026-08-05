import { notFound } from 'next/navigation';
import { getLandingPage } from '@/lib/admin/landingPagesData';
import { LandingPageForm } from '../LandingPageForm';

export const dynamic = 'force-dynamic';

export default async function EditLandingPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const landingPage = await getLandingPage(Number(id));
  if (!landingPage) notFound();

  return <LandingPageForm landingPage={landingPage} />;
}
