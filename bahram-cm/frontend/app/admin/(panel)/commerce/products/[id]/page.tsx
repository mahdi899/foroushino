import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/admin/commerceData';
import { syncProductFeaturedImageFromSite } from '../../actions';
import { ProductForm } from '../ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product = await getProduct(Number(id));
  if (!product) notFound();

  if (!product.featured_image?.trim()) {
    const synced = await syncProductFeaturedImageFromSite(product.id);
    if (synced.ok && synced.featured_image) {
      product = { ...product, featured_image: synced.featured_image };
    }
  }

  return <ProductForm product={product} />;
}
