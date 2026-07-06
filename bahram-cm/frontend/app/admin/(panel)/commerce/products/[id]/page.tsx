import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/admin/commerceData';
import { ProductForm } from '../ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(Number(id));
  if (!product) notFound();

  return <ProductForm product={product} />;
}
