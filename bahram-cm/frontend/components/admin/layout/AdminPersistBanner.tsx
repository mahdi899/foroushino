import { AdminLucideIcon } from '@/lib/admin/lucide-icons';

export function AdminPersistBanner() {
  return (
    <div className="admin-persist-banner" role="note">
      <span className="admin-persist-banner__icon">
        <AdminLucideIcon name="Info" className="h-4 w-4" strokeWidth={2} />
      </span>
      <p className="admin-persist-banner__text">
        در محیط توسعه، داده‌ها از لایه <strong>content</strong> بارگذاری می‌شوند. در تولید، تغییرات در
        دیتابیس ذخیره می‌شود.
      </p>
    </div>
  );
}
