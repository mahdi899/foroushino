'use client';

import { AdminCollection } from '../AdminCollection';

const seed = [
  { id: 'offer-1', title: 'مشاوره رایگان ثبت‌نام دوره', cta: 'ثبت‌نام', href: '/apply', active: true },
  { id: 'offer-2', title: 'دوره نویسندگی کمپین', cta: 'مشاهده دوره‌ها', href: '/courses', active: false },
];

export default function AdminOffers() {
  return (
    <AdminCollection
      title="بنرها و آفرها"
      desc="بنر آفر بالای سایت و آفرهای کمپین — قابل فعال/غیرفعال‌سازی"
      icon="Megaphone"
      collectionKey="offers"
      idKey="id"
      seed={seed}
      fields={[
        { key: 'title', label: 'متن آفر', inList: true },
        { key: 'cta', label: 'متن دکمه', inList: true },
        { key: 'href', label: 'لینک', inList: true },
        { key: 'active', label: 'فعال', type: 'boolean', inList: true },
      ]}
    />
  );
}
