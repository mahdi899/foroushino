'use client';

import { AdminCollection } from '../AdminCollection';

const seed = [
  { id: 'offer-1', title: 'مشاوره و طراحی لبخند رایگان', cta: 'رزرو مشاوره', href: '/consultation', active: true },
  { id: 'offer-2', title: 'ایمپلنت اقساطی تا ۱۲ ماه', cta: 'مشاهده شرایط', href: '/lp/implant-installment', active: false },
];

export default function AdminOffers() {
  return (
    <AdminCollection
      title="بنرها و آفرها"
      desc="بنر آفر بالای سایت و آفرهای کمپین — قابل فعال/غیرفعال‌سازی"
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
