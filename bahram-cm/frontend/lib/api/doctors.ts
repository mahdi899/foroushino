import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiDoctor } from './types';

export async function getDoctors(): Promise<ApiDoctor[]> {
  return apiData<ApiDoctor[]>('/doctors', {
    revalidate: await getRevalidateSeconds('doctors'),
    tags: ['doctors'],
  });
}

export async function getDoctor(slug: string): Promise<ApiDoctor> {
  return apiData<ApiDoctor>(`/doctors/${slug}`, {
    revalidate: await getRevalidateSeconds('doctors'),
    tags: ['doctors', `doctor:${slug}`],
  });
}
