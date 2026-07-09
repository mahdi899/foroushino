'use client';

import { AdminCollection } from '../AdminCollection';

const sections = [
  { key: 'hero', label: 'هیرو', order: 1, visible: true },
  { key: 'treatmentPath', label: 'مسیر درمان', order: 2, visible: true },
  { key: 'priorityServices', label: 'خدمات اصلی', order: 3, visible: true },
  { key: 'pricing', label: 'قیمت شفاف', order: 4, visible: true },
  { key: 'beforeAfter', label: 'قبل و بعد', order: 5, visible: true },
  { key: 'technology', label: 'تکنولوژی', order: 6, visible: true },
  { key: 'testimonials', label: 'نظرات', order: 7, visible: true },
  { key: 'localTrust', label: 'موقعیت و اعتماد', order: 8, visible: true },
  { key: 'finalCta', label: 'فراخوان نهایی', order: 9, visible: true },
];

export default function AdminHomepage() {
  return (
    <AdminCollection
      title="بخش‌های صفحه اصلی"
      desc="ترتیب و نمایش بخش‌های صفحه اصلی"
      icon="LayoutTemplate"
      headerVariant="seo"
      collectionKey="homepage"
      idKey="key"
      seed={sections}
      fields={[
        { key: 'label', label: 'بخش', inList: true },
        { key: 'key', label: 'کلید', inList: true, badge: true },
        { key: 'order', label: 'ترتیب', type: 'number', inList: true },
        { key: 'visible', label: 'نمایش', type: 'boolean', inList: true },
      ]}
    />
  );
}
