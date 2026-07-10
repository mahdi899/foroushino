import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { DiscountCodeForm } from '../DiscountCodeForm';
import { getDiscountCode, getProducts } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function EditDiscountCodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const [code, { items: products }] = await Promise.all([getDiscountCode(numericId), getProducts()]);
  if (!code) notFound();

  return (
    <AdminPage
      title={`ویرایش ${code.code}`}
      desc={code.title}
      icon="TicketPercent"
      headerVariant="commerce"
    >
      <DiscountCodeForm code={code} products={products} />
    </AdminPage>
  );
}
