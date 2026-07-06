import { AdminPage } from '../../../ui';
import { ProductForm } from '../ProductForm';

export default function NewProductPage() {
  return (
    <AdminPage title="محصول جدید" desc="ایجاد دوره یا پکیج فروش">
      <ProductForm />
    </AdminPage>
  );
}
