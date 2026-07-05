/**
 * Local MDX content provider — the default source of truth.
 *
 * Thin pass-through to the cached loaders in `@/lib/content`, exposed via the
 * shared `ContentProvider` interface so it is interchangeable with the Sanity
 * adapter.
 */
import {
  getCourseBySlug,
  getCourses,
  getEventBySlug,
  getEvents,
  getGuideBySlug,
  getGuides,
  getInsightBySlug,
  getInsights,
  getResourceBySlug,
  getResources,
  getTransformationBySlug,
  getTransformations,
} from "@/lib/content";
import type { ContentProvider } from "./types";

export const localProvider: ContentProvider = {
  name: "local",
  getInsights,
  getInsightBySlug,
  getTransformations,
  getTransformationBySlug,
  getEvents,
  getEventBySlug,
  getCourses,
  getCourseBySlug,
  getResources,
  getResourceBySlug,
  getGuides,
  getGuideBySlug,
};
