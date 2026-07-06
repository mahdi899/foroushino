'use client';

import { AdminCollection } from '../AdminCollection';
import { mainNav } from '@/content/misc';

export default function AdminNavigation() {
  return (
    <AdminCollection
      title="منوها"
      desc="مدیریت آیتم‌های منوی اصلی"
      collectionKey="navigation"
      idKey="href"
      seed={mainNav.map((m, i) => ({ href: m.href, label: m.label, order: i + 1 }))}
      fields={[
        { key: 'label', label: 'عنوان', inList: true },
        { key: 'href', label: 'لینک', inList: true },
        { key: 'order', label: 'ترتیب', type: 'number', inList: true },
      ]}
    />
  );
}
