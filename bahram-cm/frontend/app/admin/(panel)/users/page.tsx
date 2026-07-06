'use client';

import { AdminCollection } from '../AdminCollection';

// [نمونه] users & roles. Real auth/RBAC lives in users/roles/permissions tables.
const seed = [
  { email: 'admin@bahram.local', name: 'مدیر کل', role: 'SUPER_ADMIN', status: 'ACTIVE' },
  { email: 'editor@Bahram.com', name: 'ویراستار محتوا', role: 'EDITOR', status: 'ACTIVE' },
  { email: 'callcenter@Bahram.com', name: 'مرکز تماس', role: 'CALL_CENTER', status: 'ACTIVE' },
  { email: 'seo@Bahram.com', name: 'کارشناس سئو', role: 'SEO', status: 'ACTIVE' },
];

export default function AdminUsers() {
  return (
    <AdminCollection
      title="کاربران و نقش‌ها"
      desc="مدیریت دسترسی تیم (RBAC) — مناسب اعضای غیرفنی"
      collectionKey="users"
      idKey="email"
      seed={seed}
      fields={[
        { key: 'name', label: 'نام', inList: true },
        { key: 'email', label: 'ایمیل', inList: true },
        { key: 'role', label: 'نقش', type: 'select', options: ['SUPER_ADMIN', 'EDITOR', 'CALL_CENTER', 'SEO', 'VIEWER'], inList: true, badge: true },
        { key: 'status', label: 'وضعیت', type: 'select', options: ['ACTIVE', 'INACTIVE'], inList: true },
      ]}
    />
  );
}
