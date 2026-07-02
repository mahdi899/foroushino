/**
 * Sanity content provider (scaffold).
 *
 * Implements the same `ContentProvider` interface as the local MDX source.
 * This adapter is intentionally dependency-free: it documents the GROQ queries
 * and shape mapping needed for a future migration. Until a Sanity client is
 * wired in (and `@sanity/client` installed), every method falls back to the
 * local provider so the site keeps working.
 *
 * To activate:
 *   1. `npm i @sanity/client`
 *   2. Set NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET.
 *   3. Replace the `fallback(...)` calls below with `client.fetch(GROQ.x)` and
 *      map the result to the record shapes in `@/lib/content`.
 */
import { localProvider } from "./local";
import type { ContentProvider } from "./types";

/** Reference GROQ queries for the migration (kept for documentation). */
export const GROQ = {
  insights: `*[_type == "insight"] | order(date desc){
    "slug": slug.current, title, date, kicker, excerpt, tags, "body": body
  }`,
  transformations: `*[_type == "transformation"]{
    "slug": slug.current, name, role, before, after, summary, metricLabel, metricValue, "body": body
  }`,
  events: `*[_type == "event"] | order(date asc){
    "slug": slug.current, title, date, place, status, summary, registerUrl, "body": body
  }`,
  courses: `*[_type == "course"]{
    "slug": slug.current, title, subtitle, level, duration, summary, featured,
    outcomes, audience, curriculum, faqs, testimonials, pricing, tags, "body": body
  }`,
  resources: `*[_type == "resource"] | order(date desc){
    "slug": slug.current, title, type, date, summary, downloadUrl, tags, "body": body
  }`,
  guides: `*[_type == "guide"] | order(date desc){
    "slug": slug.current, title, date, summary, level, tags, "body": body
  }`,
} as const;

/**
 * Placeholder implementation: delegates to the local provider. Swap each method
 * body with a real Sanity `client.fetch` call when migrating.
 */
export const sanityProvider: ContentProvider = {
  name: "sanity",
  getInsights: () => localProvider.getInsights(),
  getInsightBySlug: (slug) => localProvider.getInsightBySlug(slug),
  getTransformations: () => localProvider.getTransformations(),
  getTransformationBySlug: (slug) => localProvider.getTransformationBySlug(slug),
  getEvents: () => localProvider.getEvents(),
  getEventBySlug: (slug) => localProvider.getEventBySlug(slug),
  getCourses: () => localProvider.getCourses(),
  getCourseBySlug: (slug) => localProvider.getCourseBySlug(slug),
  getResources: () => localProvider.getResources(),
  getResourceBySlug: (slug) => localProvider.getResourceBySlug(slug),
  getGuides: () => localProvider.getGuides(),
  getGuideBySlug: (slug) => localProvider.getGuideBySlug(slug),
};
