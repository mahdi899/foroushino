// API response types — the contract returned by the Laravel API Resources.
// These replace the hand-authored shapes in src/content/types.ts for data
// that now flows from the backend.

export interface ApiSeo {
  title: string;
  description: string | null;
  canonical: string | null;
  robots: string;
  og: Record<string, unknown> | null;
  twitter: Record<string, unknown> | null;
  schema: Record<string, unknown> | null;
}

export interface ApiCategory {
  id: number;
  type: string;
  name: string;
  slug: string;
  parent_id: number | null;
}

export interface ApiTag {
  id: number;
  name: string;
  slug: string;
}

export interface ApiArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body?: string | null;
  cover_url: string | null;
  cover_url_mobile?: string | null;
  reading_time: string | null;
  published_at: string | null;
  status: string;
  category: ApiCategory | null;
  tags?: ApiTag[];
  seo?: ApiSeo | null;
  deleted_at?: string | null;
  purge_at?: string | null;
}

export interface ApiService {
  id: number;
  slug: string;
  title_fa: string;
  short_fa: string | null;
  summary: string | null;
  body?: string | null;
  image_url: string | null;
  is_priority: boolean;
  price_from: number | null;
  order: number;
  meta: Record<string, unknown> | null;
  status: string;
  faqs?: ApiFaq[];
  seo?: ApiSeo | null;
}

export interface ApiFaq {
  id: number;
  question: string;
  answer: string;
  scope: string;
  service_id: number | null;
  page_key: string | null;
  order: number;
}

export interface ApiCase {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  treatment_duration: string | null;
  before_url: string | null;
  after_url: string | null;
  tags: string[];
  service?: ApiService | null;
  service_slug?: string | null;
  status: string;
  seo?: ApiSeo | null;
}

export interface ApiTestimonial {
  id: number;
  name: string;
  text: string;
  rating: number;
  tag: string | null;
  is_verified: boolean;
  is_featured: boolean;
  has_video: boolean;
  image_url?: string | null;
}

export interface ApiTreatmentBrand {
  id: number;
  name_fa: string;
  tier: string | null;
  short_copy: string | null;
  price_from: number;
  badge: string | null;
  image_url: string | null;
  models: string[];
}

export interface ApiTreatmentLine {
  slug: string;
  name_fa: string;
  intro: string | null;
  image_url: string | null;
  order: number;
  brands: ApiTreatmentBrand[];
}

export interface ApiPricingEstimate {
  plan_ready: boolean;
  price_from: number | null;
  currency: string;
  message: string;
}

export interface Paginated<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiSettings {
  brand: Record<string, string>;
  contact: Record<string, string>;
  location: Record<string, unknown>;
  hours: { items?: { day: string; open: string; close: string }[] };
  social: Record<string, string>;
  trust: Record<string, string>;
  offer: Record<string, unknown>;
  pricing: Record<string, unknown>;
  navigation: Record<string, { href: string; label: string }[]>;
  homepage_sections: { key: string; order: number; visible: boolean; props: Record<string, unknown> }[];
}
