'use client';

import { AdminCollection } from '../AdminCollection';
import { services } from '@/content/services';

export default function AdminServices() {
  return (
    <AdminCollection
      title="خدمات"
      desc="مدیریت صفحات خدمت، عنوان، خلاصه و قیمت پایه"
      collectionKey="services"
      idKey="slug"
      seed={services.map((s) => ({
        slug: s.slug,
        titleFa: s.titleFa,
        category: s.category,
        summary: s.summary,
        priceFrom: s.priceFrom,
        priority: s.priority,
        heroHeadline: s.heroHeadline,
      }))}
      fields={[
        { key: 'slug', label: 'اسلاگ (URL)', inList: true },
        { key: 'titleFa', label: 'عنوان فارسی', inList: true },
        { key: 'category', label: 'دسته', inList: true, badge: true },
        { key: 'priceFrom', label: 'قیمت از (تومان)', type: 'number', inList: true },
        { key: 'priority', label: 'خدمت اصلی', type: 'boolean', inList: true },
        { key: 'summary', label: 'خلاصه', type: 'textarea' },
        { key: 'heroHeadline', label: 'تیتر هیرو' },
      ]}
    />
  );
}
