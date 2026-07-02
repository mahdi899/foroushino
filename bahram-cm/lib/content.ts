import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

export type InsightRecord = {
  slug: string;
  title: string;
  date: string;
  kicker: string;
  excerpt: string;
  tags: string[];
  body: string;
};

export type TransformationRecord = {
  slug: string;
  name: string;
  role: string;
  before: string;
  after: string;
  summary: string;
  metricLabel?: string;
  metricValue?: string;
  body: string;
};

export type EventRecord = {
  slug: string;
  title: string;
  date: string;
  place: string;
  status: "upcoming" | "recording";
  summary: string;
  registerUrl?: string;
  body: string;
};

export type CourseModule = { title: string; lessons: string[] };
export type CourseFaq = { q: string; a: string };
export type CourseTestimonial = { name: string; role: string; quote: string };
export type CoursePricingTier = {
  name: string;
  price: string;
  note?: string;
  features: string[];
  highlighted?: boolean;
};

export type CourseRecord = {
  slug: string;
  title: string;
  subtitle: string;
  level: string;
  duration: string;
  summary: string;
  featured: boolean;
  outcomes: string[];
  audience: string[];
  curriculum: CourseModule[];
  faqs: CourseFaq[];
  testimonials: CourseTestimonial[];
  pricing: CoursePricingTier[];
  tags: string[];
  body: string;
};

export type ResourceRecord = {
  slug: string;
  title: string;
  type: string;
  date: string;
  summary: string;
  downloadUrl?: string;
  tags: string[];
  body: string;
};

export type GuideRecord = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  level: string;
  tags: string[];
  body: string;
};

/* -------------------------------------------------------------------------- */
/*  Low-level reader (cached per request)                                       */
/* -------------------------------------------------------------------------- */

type RawDoc = { slug: string; data: Record<string, unknown>; content: string };

const readCollection = cache(async (folder: string): Promise<RawDoc[]> => {
  const dir = path.join(process.cwd(), "content", folder);
  let entries: string[] = [];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const files = entries.filter((f) => f.endsWith(".mdx"));
  return Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.mdx$/, ""),
        data: data as Record<string, unknown>,
        content: content.trim(),
      };
    }),
  );
});

const str = (v: unknown, fallback = ""): string =>
  v === undefined || v === null ? fallback : String(v);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];

/* -------------------------------------------------------------------------- */
/*  Insights                                                                    */
/* -------------------------------------------------------------------------- */

export const getInsights = cache(async (): Promise<InsightRecord[]> => {
  const docs = await readCollection("insights");
  return docs
    .map((d) => ({
      slug: d.slug,
      title: str(d.data.title, d.slug),
      date: str(d.data.date, "2026-01-01"),
      kicker: str(d.data.kicker, "یادداشت"),
      excerpt: str(d.data.excerpt, d.content.slice(0, 160).trim()),
      tags: strArr(d.data.tags),
      body: d.content,
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
});

export async function getInsightBySlug(slug: string) {
  return (await getInsights()).find((x) => x.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Transformations                                                             */
/* -------------------------------------------------------------------------- */

export const getTransformations = cache(async (): Promise<TransformationRecord[]> => {
  const docs = await readCollection("transformations");
  return docs.map((d) => ({
    slug: d.slug,
    name: str(d.data.name, d.slug),
    role: str(d.data.role, "دانشجو"),
    before: str(d.data.before),
    after: str(d.data.after),
    summary: str(d.data.summary, d.content.slice(0, 170).trim()),
    metricLabel: d.data.metricLabel ? str(d.data.metricLabel) : undefined,
    metricValue: d.data.metricValue ? str(d.data.metricValue) : undefined,
    body: d.content,
  }));
});

export async function getTransformationBySlug(slug: string) {
  return (await getTransformations()).find((x) => x.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Events                                                                      */
/* -------------------------------------------------------------------------- */

export const getEvents = cache(async (): Promise<EventRecord[]> => {
  const docs = await readCollection("events");
  return docs
    .map((d) => ({
      slug: d.slug,
      title: str(d.data.title, d.slug),
      date: str(d.data.date, "2026-01-01"),
      place: str(d.data.place, "آنلاین"),
      status: d.data.status === "recording" ? ("recording" as const) : ("upcoming" as const),
      summary: str(d.data.summary, d.content.slice(0, 160).trim()),
      registerUrl: d.data.registerUrl ? str(d.data.registerUrl) : undefined,
      body: d.content,
    }))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
});

export async function getEventBySlug(slug: string) {
  return (await getEvents()).find((x) => x.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Courses                                                                     */
/* -------------------------------------------------------------------------- */

function asModules(v: unknown): CourseModule[] {
  if (!Array.isArray(v)) return [];
  return v.map((m) => {
    const obj = m as Record<string, unknown>;
    return { title: str(obj.title), lessons: strArr(obj.lessons) };
  });
}
function asFaqs(v: unknown): CourseFaq[] {
  if (!Array.isArray(v)) return [];
  return v.map((m) => {
    const obj = m as Record<string, unknown>;
    return { q: str(obj.q), a: str(obj.a) };
  });
}
function asTestimonials(v: unknown): CourseTestimonial[] {
  if (!Array.isArray(v)) return [];
  return v.map((m) => {
    const obj = m as Record<string, unknown>;
    return { name: str(obj.name), role: str(obj.role), quote: str(obj.quote) };
  });
}
function asPricing(v: unknown): CoursePricingTier[] {
  if (!Array.isArray(v)) return [];
  return v.map((m) => {
    const obj = m as Record<string, unknown>;
    return {
      name: str(obj.name),
      price: str(obj.price),
      note: obj.note ? str(obj.note) : undefined,
      features: strArr(obj.features),
      highlighted: Boolean(obj.highlighted),
    };
  });
}

export const getCourses = cache(async (): Promise<CourseRecord[]> => {
  const docs = await readCollection("courses");
  return docs
    .map((d) => ({
      slug: d.slug,
      title: str(d.data.title, d.slug),
      subtitle: str(d.data.subtitle),
      level: str(d.data.level, "مقدماتی تا پیشرفته"),
      duration: str(d.data.duration),
      summary: str(d.data.summary, d.content.slice(0, 160).trim()),
      featured: Boolean(d.data.featured),
      outcomes: strArr(d.data.outcomes),
      audience: strArr(d.data.audience),
      curriculum: asModules(d.data.curriculum),
      faqs: asFaqs(d.data.faqs),
      testimonials: asTestimonials(d.data.testimonials),
      pricing: asPricing(d.data.pricing),
      tags: strArr(d.data.tags),
      body: d.content,
    }))
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title, "fa"));
});

export async function getCourseBySlug(slug: string) {
  return (await getCourses()).find((x) => x.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Resources                                                                   */
/* -------------------------------------------------------------------------- */

export const getResources = cache(async (): Promise<ResourceRecord[]> => {
  const docs = await readCollection("resources");
  return docs
    .map((d) => ({
      slug: d.slug,
      title: str(d.data.title, d.slug),
      type: str(d.data.type, "راهنما"),
      date: str(d.data.date, "2026-01-01"),
      summary: str(d.data.summary, d.content.slice(0, 160).trim()),
      downloadUrl: d.data.downloadUrl ? str(d.data.downloadUrl) : undefined,
      tags: strArr(d.data.tags),
      body: d.content,
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
});

export async function getResourceBySlug(slug: string) {
  return (await getResources()).find((x) => x.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Guides                                                                      */
/* -------------------------------------------------------------------------- */

export const getGuides = cache(async (): Promise<GuideRecord[]> => {
  const docs = await readCollection("guides");
  return docs
    .map((d) => ({
      slug: d.slug,
      title: str(d.data.title, d.slug),
      date: str(d.data.date, "2026-01-01"),
      summary: str(d.data.summary, d.content.slice(0, 160).trim()),
      level: str(d.data.level, "همه‌ی سطح‌ها"),
      tags: strArr(d.data.tags),
      body: d.content,
    }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
});

export async function getGuideBySlug(slug: string) {
  return (await getGuides()).find((x) => x.slug === slug) ?? null;
}
