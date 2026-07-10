import 'server-only';

import { siteConfig } from '@/config/site';
import { site } from '@/content/site';
import { adminFetch } from '@/lib/auth/session';
import type { ApiArticle } from '@/lib/api/types';

/** Compact site map + content snapshot for AI article generation. */
export interface AiSiteContext {
  brand: {
    name: string;
    tagline: string;
    district: string;
    city: string;
    phone: string;
    whatsapp: string;
  };
  trust: {
    yearsExperience: string;
    successfulImplants: string;
    guarantee: string;
    installmentMonths: number;
  };
  sitemap: { path: string; label: string; kind: string }[];
  services: {
    slug: string;
    title: string;
    summary: string;
    priceFrom: string | null;
    lines: { name: string; brands?: string; priceFrom: string | null }[];
    faqTopics: string[];
  }[];
  landingPages: { path: string; title: string; hook: string; service: string }[];
  cases: { slug: string; title: string; service: string; summary: string }[];
  blogArticles: { slug: string; title: string; excerpt: string }[];
  globalFaqs: { q: string; a: string }[];
  technologies: string[];
  pricingNotes: string[];
  internalLinkTargets: string[];
}

const CORE_PAGES: { path: string; label: string; kind: string }[] = [
  { path: '/', label: 'صفحه اصلی', kind: 'marketing' },
  { path: '/course/campaign-writing', label: 'کمپین‌نویسی', kind: 'product' },
  { path: '/courses', label: 'دوره‌ها', kind: 'product' },
  { path: '/saat', label: 'سات', kind: 'product' },
  { path: '/insights', label: 'بلاگ', kind: 'content' },
  { path: '/articles', label: 'مقالات', kind: 'content' },
  { path: '/transformations', label: 'رضایت دانشجوها', kind: 'trust' },
  { path: '/founder', label: 'درباره بهرام', kind: 'trust' },
  { path: '/contact', label: 'تماس با ما', kind: 'support' },
  { path: '/faq', label: 'سوالات متداول', kind: 'support' },
];

function buildBahramContext(blogArticles: { slug: string; title: string; excerpt: string }[]): AiSiteContext {

  const services = site.mainPaths.items.map((item) => ({
    slug: item.href.replace(/^\//, ''),
    title: item.label,
    summary: item.description,
    priceFrom: null,
    lines: [{ name: item.tagline, priceFrom: null }],
    faqTopics: [],
  }));

  const sitemap = [
    ...CORE_PAGES,
    ...blogArticles.map((a) => ({ path: `/insights/${a.slug}`, label: a.title, kind: 'content' })),
  ];

  return {
    brand: {
      name: siteConfig.brand.nameFa,
      tagline: siteConfig.brand.tagline,
      district: siteConfig.location.district,
      city: siteConfig.location.city,
      phone: siteConfig.contact.phone,
      whatsapp: siteConfig.contact.whatsapp,
    },
    trust: {
      yearsExperience: siteConfig.trust.yearsExperience,
      successfulImplants: siteConfig.trust.successfulImplants,
      guarantee: siteConfig.trust.guarantee,
      installmentMonths: 0,
    },
    sitemap,
    services,
    landingPages: [],
    cases: site.transformations.map((t) => ({
      slug: t.slug,
      title: t.name,
      service: t.role,
      summary: t.oneLine,
    })),
    blogArticles,
    globalFaqs: [],
    technologies: [],
    pricingNotes: [],
    internalLinkTargets: sitemap.map((p) => p.path),
  };
}

export async function getAiSiteContext(): Promise<AiSiteContext> {
  return buildSiteContextForAi();
}

async function loadBlogArticlesForAi(): Promise<{ slug: string; title: string; excerpt: string }[]> {
  try {
    const res = await adminFetch<{ data: ApiArticle[] }>('/panel/articles', {
      query: { per_page: 50, status: 'active' },
    });
    const fromApi = res.data
      .filter((a) => a.slug && a.status === 'active')
      .map((a) => ({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt?.trim() || a.title,
      }));
    if (fromApi.length) return fromApi;
  } catch {
    // fall back to static site content
  }
  return site.insights.map((item) => ({
    slug: item.slug,
    title: item.title,
    excerpt: item.kicker,
  }));
}

export async function buildSiteContextForAi(): Promise<AiSiteContext> {
  const blogArticles = await loadBlogArticlesForAi();
  return buildBahramContext(blogArticles);
}
