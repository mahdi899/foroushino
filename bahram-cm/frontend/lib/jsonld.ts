import { SITE } from "./seo";
import { FOUNDER_IMAGE, LOGO_IMAGE } from "@/config/media";
import { resolveSitemapImageUrl } from "@/lib/mediaUrl";

export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "بهرام رستمی",
    alternateName: "Bahram Rostami",
    url: SITE.url,
    image: resolveSitemapImageUrl(FOUNDER_IMAGE),
    jobTitle: "معمار مسیر رشد حرفه‌ای",
    description:
      "بنیان‌گذار آکادمی و مدرس مسیر کمپین‌نویسی؛ بیش از ۵۰ هزار دانشجو در بازار فارسی.",
    sameAs: [
      "https://www.instagram.com/bahramrostami",
      "https://t.me/bahramrostami",
      "https://www.youtube.com/@bahramrostami",
    ],
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "آکادمی",
    alternateName: "Academy",
    url: SITE.url,
    logo: resolveSitemapImageUrl(LOGO_IMAGE),
    founder: {
      "@type": "Person",
      name: "بهرام رستمی",
    },
    description: "اکوسیستم خصوصی رشد حرفه‌ای.",
  };
}

export function courseJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "کمپین‌نویسی",
    description:
      "مسیر تبدیل شدن از مخاطب به سازنده‌ی کمپین — اولین گام در اکوسیستم آکادمی.",
    provider: {
      "@type": "Organization",
      name: "آکادمی",
      sameAs: SITE.url,
    },
    inLanguage: "fa-IR",
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  datePublished,
  section,
}: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  section?: string;
}) {
  const url = `${SITE.url}${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "fa-IR",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    ...(datePublished ? { datePublished, dateModified: datePublished } : {}),
    ...(section ? { articleSection: section } : {}),
    image: `${SITE.url}${path}/opengraph-image`,
    author: { "@type": "Person", name: "بهرام رستمی", url: SITE.url },
    publisher: {
      "@type": "Organization",
      name: SITE.ecosystem,
      logo: { "@type": "ImageObject", url: resolveSitemapImageUrl(LOGO_IMAGE) },
    },
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE.url}${c.path}`,
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/insights?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
