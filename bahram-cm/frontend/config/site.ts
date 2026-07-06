/** Central site configuration for admin SEO tools and shared brand metadata. */
export const siteConfig = {
  brand: {
    nameFa: 'بهرام رستمی',
    shortFa: 'بهرام',
    nameEn: 'Bahram Rostami',
    shortEn: 'Bahram',
    tagline: 'سات؛ هر تماس، یک فرصت فروش',
  },
  contact: {
    phone: '۰۲۱-۰۰۰۰۰۰۰۰',
    phoneRaw: '+982100000000',
    whatsapp: '۰۹۱۲۰۰۰۰۰۰۰',
    whatsappRaw: '989120000000',
    email: 'hello@bahramrostami.com',
  },
  location: {
    district: 'تهران',
    address: 'تهران',
    city: 'تهران',
    region: 'Tehran',
    postalCode: '0000000000',
    geo: { lat: 35.6892, lng: 51.389 },
    mapUrl: 'https://maps.google.com/?q=35.6892,51.389',
  },
  hours: [
    { day: 'شنبه تا پنجشنبه', open: '۹:۰۰', close: '۱۸:۰۰' },
    { day: 'جمعه', open: 'تعطیل', close: '' },
  ],
  social: {
    instagram: 'https://instagram.com/bahramrostami',
    telegram: 'https://t.me/bahramrostami',
  },
  trust: {
    yearsExperience: '۱۰+',
    successfulImplants: '',
    guarantee: '',
    installmentRange: '',
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
} as const;

export type SiteConfig = typeof siteConfig;
