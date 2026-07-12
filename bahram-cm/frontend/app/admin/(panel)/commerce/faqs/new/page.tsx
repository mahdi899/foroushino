import { AdminPage } from '../../../ui';
import { FaqForm } from '../FaqForm';

export default function NewFaqPage() {
  return (
    <AdminPage title="سوال جدید" desc="افزودن سوال متداول" backHref="/admin/commerce/faqs">
      <FaqForm />
    </AdminPage>
  );
}
