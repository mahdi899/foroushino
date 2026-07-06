import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getProduct } from '@/lib/admin/commerceData';
import { ProductForm } from '../ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  return (
    <AdminPage title={`ویرایش: ${product.title}`} desc="ویرایش اطلاعات محصول">
      <ProductForm product={product} />
    </AdminPage>
  );
}
