'use client';

import { AdminCollection } from '../AdminCollection';
import { siteConfig } from '@/config/site';

const seed = [
  {
    id: 'main',
    businessName: siteConfig.brand.nameFa,
    address: siteConfig.location.address,
    district: siteConfig.location.district,
    geoLat: String(siteConfig.location.geo.lat),
    geoLng: String(siteConfig.location.geo.lng),
    mapUrl: siteConfig.location.mapUrl,
  },
];

export default function AdminLocalSeo() {
  return (
    <AdminCollection
      title="سئوی محلی"
      desc="اطلاعات کسب‌وکار محلی برای اسکیمای LocalBusiness و گوگل مپ"
      icon="MapPin"
      headerVariant="seo"
      collectionKey="local-seo"
      idKey="id"
      seed={seed}
      fields={[
        { key: 'businessName', label: 'نام کسب‌وکار', inList: true },
        { key: 'district', label: 'محله', inList: true, badge: true },
        { key: 'address', label: 'آدرس', type: 'textarea', inList: true },
        { key: 'geoLat', label: 'عرض جغرافیایی' },
        { key: 'geoLng', label: 'طول جغرافیایی' },
        { key: 'mapUrl', label: 'لینک نقشه' },
      ]}
    />
  );
}
