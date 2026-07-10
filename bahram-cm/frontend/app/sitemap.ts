import type { MetadataRoute } from "next";
import {
  getCourses,
  getEvents,
  getGuides,
  getResources,
} from "@/lib/content";
import { getArticles } from "@/lib/services/articles";
import { getMiniCoursesFromApi } from "@/lib/services/miniCourses.server";
import { SITE } from "@/lib/seo";

/** Static routes with their relative priority + change cadence. */
const STATIC_ROUTES: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "weekly" },
  { path: "/course/campaign-writing", priority: 0.9, freq: "weekly" },
  { path: "/courses", priority: 0.8, freq: "weekly" },
  { path: "/mini-courses", priority: 0.6, freq: "monthly" },
  { path: "/saat", priority: 0.8, freq: "monthly" },
  { path: "/insights", priority: 0.7, freq: "weekly" },
  { path: "/guides", priority: 0.7, freq: "weekly" },
  { path: "/resources", priority: 0.7, freq: "weekly" },
  { path: "/transformations", priority: 0.7, freq: "monthly" },
  { path: "/events", priority: 0.6, freq: "weekly" },
  { path: "/founder", priority: 0.6, freq: "monthly" },
  { path: "/contact", priority: 0.5, freq: "monthly" },
  { path: "/faq", priority: 0.5, freq: "monthly" },
  { path: "/legal/privacy", priority: 0.3, freq: "yearly" },
  { path: "/legal/terms", priority: 0.3, freq: "yearly" },
  { path: "/legal/cookies", priority: 0.3, freq: "yearly" },
  { path: "/legal/data-request", priority: 0.3, freq: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const articlesResult = await getArticles(1, 100);
  const insights = articlesResult.ok
    ? articlesResult.data.items.map((item) => ({
        slug: item.slug,
        date: item.published_at ?? undefined,
      }))
    : [];

  const [events, courses, resources, guides, miniCoursesResult] = await Promise.all([
    getEvents(),
    getCourses(),
    getResources(),
    getGuides(),
    getMiniCoursesFromApi(),
  ]);

  const miniCourses = miniCoursesResult.ok
    ? miniCoursesResult.data.map((c) => ({ slug: c.slug }))
    : [];

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE.url}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  const dynamic = (
    base: string,
    items: { slug: string; date?: string }[],
    priority = 0.6,
  ): MetadataRoute.Sitemap =>
    items.map((item) => ({
      url: `${SITE.url}${base}/${item.slug}`,
      lastModified: item.date ? new Date(item.date) : now,
      changeFrequency: "monthly" as const,
      priority,
    }));

  return [
    ...staticEntries,
    ...dynamic("/insights", insights, 0.6),
    ...dynamic("/events", events, 0.5),
    ...dynamic("/courses", courses, 0.7),
    ...dynamic("/mini-courses", miniCourses, 0.6),
    ...dynamic("/resources", resources, 0.5),
    ...dynamic("/guides", guides, 0.5),
  ];
}
