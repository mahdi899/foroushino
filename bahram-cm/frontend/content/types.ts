// Shared content types — mirror the Prisma models so the same shapes flow from
// the typed content layer (SSG) and from the database (admin-managed) in prod.

export type PriceType = 'FIXED' | 'FROM' | 'RANGE' | 'CONSULTATION' | 'CAMPAIGN' | 'VIP';

export interface PriceRow {
  label: string;
  type: PriceType;
  amountMin?: number;
  amountMax?: number;
  note?: string;
  vip?: boolean;
}

export interface ServiceLine {
  name: string;
  badge?: string;
  brandExamples: string;
  successRate: string;
  guarantee: string;
  duration: string;
  devices: string[];
  priceFrom: number;
  priceTo: number;
}

export interface ServiceSectionCopy {
  heroCtaPrimary?: string;
  stepsTitle?: string;
  linesEyebrow?: string;
  linesTitle?: string;
  linesIntro?: string;
  pricingEyebrow?: string;
  pricingTitle?: string;
  pricingIntro?: string;
  pricingCtaTitle?: string;
  pricingCtaIntro?: string;
  pricingCtaButton?: string;
  casesEyebrow?: string;
  casesTitle?: string;
  leadTitle?: string;
  leadIntro?: string;
  leadPhotoHint?: string;
  leadPhotoPrivacy?: string;
  leadConsent?: string;
}

export interface ServiceContent {
  slug: string;
  category: string;
  titleFa: string;
  shortFa: string;
  summary: string;
  heroHeadline: string;
  heroSub: string;
  image: string;
  priority: boolean;
  benefits: { icon: string; title: string; desc: string }[];
  steps: { title: string; desc: string }[];
  lines?: ServiceLine[];
  priceFrom: number;
  faqs: { q: string; a: string }[];
  seo: { title: string; description: string };
  copy?: ServiceSectionCopy;
}

export interface CaseContent {
  slug: string;
  title: string;
  service: string;
  serviceLabel: string;
  summary: string;
  duration: string;
  before: string;
  after: string;
  tags: string[];
}

export interface ConsultationQuestion {
  key: string;
  question: string;
  helper?: string;
  options: { value: string; label: string; maps?: string[] }[];
}

export interface LandingContent {
  slug: string;
  title: string;
  hook: 'trust' | 'cosmetic' | 'transform' | 'simple';
  headline: string;
  sub: string;
  offer: string;
  service: string;
  priceFrom: number;
  indexable: boolean;
  badges: string[];
  faqs: { q: string; a: string }[];
  objections: { q: string; a: string }[];
  seo: { title: string; description: string };
}
