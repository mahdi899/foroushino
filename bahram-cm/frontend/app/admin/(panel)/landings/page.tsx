'use client';

import { AdminCollection } from '../AdminCollection';
import { landingPages } from '@/content/landing';

export default function AdminLandings() {
  return (
    <AdminCollection
      title="لندینگ‌های کمپین"
      desc="هر لندینگ هوک بصری و آفر خودش را دارد — کنترل ایندکس‌شدن در سئو"
      collectionKey="landings"
      idKey="slug"
      seed={landingPages.map((l) => ({
        slug: l.slug,
        title: l.title,
        hook: l.hook,
        offer: l.offer,
        service: l.service,
        priceFrom: l.priceFrom,
        indexable: l.indexable,
        headline: l.headline,
      }))}
      fields={[
        { key: 'slug', label: 'اسلاگ (URL)', inList: true },
        { key: 'title', label: 'عنوان', inList: true },
        { key: 'hook', label: 'هوک بصری', type: 'select', options: ['trust', 'cosmetic', 'transform', 'simple'], inList: true, badge: true },
        { key: 'service', label: 'خدمت', type: 'select', options: ['implant', 'laminate', 'cosmetic'], inList: true },
        { key: 'indexable', label: 'ایندکس‌شود', type: 'boolean', inList: true },
        { key: 'offer', label: 'آفر' },
        { key: 'headline', label: 'تیتر' },
        { key: 'priceFrom', label: 'قیمت از (تومان)', type: 'number' },
      ]}
    />
  );
}
