import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiFaq } from './types';

export async function getFaqs(scope = 'global'): Promise<ApiFaq[]> {
  return apiData<ApiFaq[]>(`/faqs?filter[scope]=${scope}`, {
    revalidate: await getRevalidateSeconds('services'),
    tags: ['faqs'],
  });
}
