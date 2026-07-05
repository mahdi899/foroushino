/**
 * Active content provider.
 *
 * Selects the backing store at module load: Sanity when a project ID is
 * configured, otherwise the local MDX filesystem. Pages/components should import
 * `cms` from here rather than `@/lib/content` directly so the source can be
 * swapped centrally.
 */
import { localProvider } from "./local";
import { sanityProvider } from "./sanity";
import type { ContentProvider } from "./types";

const sanityConfigured = Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

export const cms: ContentProvider = sanityConfigured ? sanityProvider : localProvider;

export function activeProviderName(): ContentProvider["name"] {
  return cms.name;
}

export type {
  ContentProvider,
  CourseRecord,
  EventRecord,
  GuideRecord,
  InsightRecord,
  ResourceRecord,
  TransformationRecord,
} from "./types";
