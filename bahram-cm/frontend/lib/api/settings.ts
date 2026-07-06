import 'server-only';
import { apiData } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiSettings, ApiTestimonial } from './types';

export async function getSettings(): Promise<ApiSettings> {
  return apiData<ApiSettings>('/settings', {
    revalidate: await getRevalidateSeconds('settings'),
    tags: ['settings'],
  });
}

export async function getTestimonials(): Promise<ApiTestimonial[]> {
  return apiData<ApiTestimonial[]>('/testimonials', {
    revalidate: await getRevalidateSeconds('settings'),
    tags: ['testimonials'],
  });
}
