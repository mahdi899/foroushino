'use client';

import { AdminCollection } from '../AdminCollection';
import { globalFaqs } from '@/content/misc';

export default function AdminFaq() {
  return (
    <AdminCollection
      title="سوالات متداول"
      desc="پرسش‌های عمومی — برای اسکیمای FAQ استفاده می‌شوند"
      collectionKey="faq"
      idKey="q"
      seed={globalFaqs.map((f) => ({ q: f.q, a: f.a }))}
      fields={[
        { key: 'q', label: 'پرسش', inList: true },
        { key: 'a', label: 'پاسخ', type: 'textarea', inList: true },
      ]}
    />
  );
}
