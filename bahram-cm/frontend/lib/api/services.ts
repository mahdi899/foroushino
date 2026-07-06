import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiService } from './types';

export async function getServices(): Promise<ApiService[]> {
  return apiData<ApiService[]>('/services', {
    revalidate: await getRevalidateSeconds('services'),
    tags: ['services'],
  });
}

export async function getService(slug: string): Promise<ApiService> {
  return apiData<ApiService>(`/services/${slug}`, {
    revalidate: await getRevalidateSeconds('services'),
    tags: ['services', `service:${slug}`],
  });
}
