import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiCase } from './types';

export async function getCases(serviceSlug?: string): Promise<ApiCase[]> {
  const qs = serviceSlug && serviceSlug !== 'all' ? `?filter[service]=${serviceSlug}` : '';
  return apiData<ApiCase[]>(`/cases${qs}`, {
    revalidate: await getRevalidateSeconds('cases'),
    tags: ['cases'],
  });
}

export async function getCase(slug: string): Promise<ApiCase> {
  return apiData<ApiCase>(`/cases/${slug}`, {
    revalidate: await getRevalidateSeconds('cases'),
    tags: ['cases', `case:${slug}`],
  });
}
