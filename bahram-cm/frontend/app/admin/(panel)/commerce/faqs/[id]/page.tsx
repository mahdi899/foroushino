import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getFaq } from '@/lib/admin/commerceData';
import { FaqForm } from '../FaqForm';

export const dynamic = 'force-dynamic';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const faq = await getFaq(Number(id));
  if (!faq) notFound();

  return (
    <AdminPage title="ویرایش سوال" desc={faq.question} backHref="/admin/commerce/faqs">
      <FaqForm faq={faq} />
    </AdminPage>
  );
}
