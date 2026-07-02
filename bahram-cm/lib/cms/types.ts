/**
 * Content-source abstraction.
 *
 * The site reads all editorial content through a single `ContentProvider`
 * interface. The default implementation is the local MDX filesystem
 * (`local.ts`). A Sanity adapter (`sanity.ts`) implements the same interface so
 * the backing store can be swapped by setting `NEXT_PUBLIC_SANITY_PROJECT_ID` —
 * no page/component changes required.
 */
import type {
  CourseRecord,
  EventRecord,
  GuideRecord,
  InsightRecord,
  ResourceRecord,
  TransformationRecord,
} from "@/lib/content";

export type {
  CourseRecord,
  EventRecord,
  GuideRecord,
  InsightRecord,
  ResourceRecord,
  TransformationRecord,
};

export interface ContentProvider {
  readonly name: "local" | "sanity";

  getInsights(): Promise<InsightRecord[]>;
  getInsightBySlug(slug: string): Promise<InsightRecord | null>;

  getTransformations(): Promise<TransformationRecord[]>;
  getTransformationBySlug(slug: string): Promise<TransformationRecord | null>;

  getEvents(): Promise<EventRecord[]>;
  getEventBySlug(slug: string): Promise<EventRecord | null>;

  getCourses(): Promise<CourseRecord[]>;
  getCourseBySlug(slug: string): Promise<CourseRecord | null>;

  getResources(): Promise<ResourceRecord[]>;
  getResourceBySlug(slug: string): Promise<ResourceRecord | null>;

  getGuides(): Promise<GuideRecord[]>;
  getGuideBySlug(slug: string): Promise<GuideRecord | null>;
}
