'use client';

import { AdminCollection } from '../AdminCollection';
import { landingPages } from '@/content/landing';

// Derive campaigns from landing pages (each LP maps to a campaign).
const seed = landingPages.map((l) => ({
  slug: l.slug,
  name: l.title,
  source: l.hook === 'simple' ? 'google' : 'instagram',
  channel: 'paid',
  status: 'ACTIVE',
}));

export default function AdminCampaigns() {
  return (
    <AdminCollection
      title="کمپین‌ها"
      desc="منبع، کانال و وضعیت کمپین‌ها برای ردیابی UTM"
      icon="TrendingUp"
      collectionKey="campaigns"
      idKey="slug"
      seed={seed}
      fields={[
        { key: 'slug', label: 'اسلاگ', inList: true },
        { key: 'name', label: 'نام کمپین', inList: true },
        { key: 'source', label: 'منبع', type: 'select', options: ['instagram', 'google', 'sms', 'telegram'], inList: true, badge: true },
        { key: 'channel', label: 'کانال', type: 'select', options: ['paid', 'organic', 'referral'], inList: true },
        { key: 'status', label: 'وضعیت', type: 'select', options: ['ACTIVE', 'INACTIVE'], inList: true },
      ]}
    />
  );
}
