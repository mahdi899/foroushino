import { ContentCommentsAdminPanel } from './ContentCommentsAdminPanel';
import { getAdminContentComments } from '@/lib/admin/contentCommentsData';

export default async function AdminContentCommentsPage() {
  const { items, error } = await getAdminContentComments();

  return (
    <div className="admin-page">
      <ContentCommentsAdminPanel comments={items} error={error} />
    </div>
  );
}
