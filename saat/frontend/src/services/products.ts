import { http } from '@/services/http'
import type { Product } from '@/types'
import { id } from '@/services/mappers'

type Dto = Record<string, unknown>

export function mapProduct(dto: Dto): Product {
  return {
    id: id(dto.id as string | number),
    name: (dto.name as string) ?? '',
    slug: (dto.slug as string) ?? undefined,
    price: Number(dto.price ?? 0),
    category: (dto.category as string) ?? '',
    commissionRate: Number(dto.commission_rate ?? dto.commissionRate ?? 0),
    description: (dto.description as string) ?? undefined,
    coverImageUrl: (dto.cover_image_url as string) ?? (dto.coverImageUrl as string) ?? undefined,
    videoUrl: (dto.video_url as string) ?? (dto.videoUrl as string) ?? undefined,
    landingUrl: (dto.landing_url as string) ?? (dto.landingUrl as string) ?? undefined,
    isActive: dto.is_active !== false,
  }
}

export async function fetchProduct(slug: string): Promise<Product> {
  const raw = await http.get<Dto>(`/products/${slug}`)
  return mapProduct(raw)
}
