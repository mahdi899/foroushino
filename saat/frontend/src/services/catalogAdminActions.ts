import { http } from '@/services/http'
import { useStore } from '@/store/useStore'
import type { LeadSourceOption, Product } from '@/types'
import { id } from '@/services/mappers'

type Dto = Record<string, unknown>

import { mapProduct } from '@/services/products'

function mapLeadSource(dto: Dto): LeadSourceOption {
  return {
    id: id(dto.id as string | number),
    slug: (dto.slug as string) ?? '',
    label: (dto.label as string) ?? '',
    sortOrder: Number(dto.sort_order ?? dto.sortOrder ?? 0),
    isActive: dto.is_active !== false,
    isSystem: dto.is_system === true,
    showInForm: dto.show_in_form !== false,
  }
}

export interface CreateProductInput {
  name: string
  slug: string
  category?: string
  price: number
  commissionRate: number
  description?: string
  videoUrl?: string
  landingUrl?: string
  isActive?: boolean
}

export interface UpdateProductInput {
  name?: string
  slug?: string
  category?: string
  price?: number
  commissionRate?: number
  description?: string
  videoUrl?: string
  landingUrl?: string
  isActive?: boolean
}

export interface CreateLeadSourceInput {
  slug: string
  label: string
  sortOrder?: number
  isActive?: boolean
  showInForm?: boolean
}

export interface UpdateLeadSourceInput {
  slug?: string
  label?: string
  sortOrder?: number
  isActive?: boolean
  showInForm?: boolean
}

export async function fetchAdminProducts(): Promise<Product[]> {
  const raw = await http.get<Dto[]>('/admin/products')
  return (Array.isArray(raw) ? raw : []).map(mapProduct)
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const raw = await http.post<Dto>('/admin/products', {
    name: input.name.trim(),
    slug: input.slug.trim(),
    category: input.category?.trim() || null,
    price: input.price,
    commission_rate: input.commissionRate,
    description: input.description?.trim() || null,
    video_url: input.videoUrl?.trim() || null,
    landing_url: input.landingUrl?.trim() || null,
    is_active: input.isActive ?? true,
  })
  const product = mapProduct(raw)
  const products = useStore.getState().products
  useStore.getState().setProducts([...products.filter((row) => row.id !== product.id), product])
  return product
}

export async function updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
  const payload: Dto = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.slug != null) payload.slug = input.slug.trim()
  if (input.category != null) payload.category = input.category.trim() || null
  if (input.price != null) payload.price = input.price
  if (input.commissionRate != null) payload.commission_rate = input.commissionRate
  if (input.description != null) payload.description = input.description.trim() || null
  if (input.videoUrl != null) payload.video_url = input.videoUrl.trim() || null
  if (input.landingUrl != null) payload.landing_url = input.landingUrl.trim() || null
  if (input.isActive != null) payload.is_active = input.isActive

  const raw = await http.patch<Dto>(`/admin/products/${productId}`, payload)
  const product = mapProduct(raw)
  useStore.getState().setProducts(
    useStore.getState().products.map((row) => (row.id === product.id ? product : row)),
  )
  return product
}

export async function deactivateProduct(productId: string): Promise<void> {
  await http.del(`/admin/products/${productId}`)
  useStore.getState().setProducts(
    useStore.getState().products.map((row) => (row.id === productId ? { ...row, isActive: false } : row)),
  )
}

export async function fetchAdminLeadSources(): Promise<LeadSourceOption[]> {
  const raw = await http.get<Dto[]>('/admin/lead-sources')
  return (Array.isArray(raw) ? raw : []).map(mapLeadSource)
}

export async function createLeadSource(input: CreateLeadSourceInput): Promise<LeadSourceOption> {
  const raw = await http.post<Dto>('/admin/lead-sources', {
    slug: input.slug.trim(),
    label: input.label.trim(),
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    show_in_form: input.showInForm ?? true,
  })
  const source = mapLeadSource(raw)
  const leadSources = useStore.getState().leadSources
  useStore.getState().setLeadSources([...leadSources.filter((row) => row.id !== source.id), source])
  return source
}

export async function updateLeadSource(
  sourceId: string,
  input: UpdateLeadSourceInput,
): Promise<LeadSourceOption> {
  const payload: Dto = {}
  if (input.slug != null) payload.slug = input.slug.trim()
  if (input.label != null) payload.label = input.label.trim()
  if (input.sortOrder != null) payload.sort_order = input.sortOrder
  if (input.isActive != null) payload.is_active = input.isActive
  if (input.showInForm != null) payload.show_in_form = input.showInForm

  const raw = await http.patch<Dto>(`/admin/lead-sources/${sourceId}`, payload)
  const source = mapLeadSource(raw)
  useStore.getState().setLeadSources(
    useStore.getState().leadSources.map((row) => (row.id === source.id ? source : row)),
  )
  return source
}

export async function deactivateLeadSource(sourceId: string): Promise<void> {
  await http.del(`/admin/lead-sources/${sourceId}`)
  useStore.getState().setLeadSources(
    useStore.getState().leadSources.map((row) => (row.id === sourceId ? { ...row, isActive: false } : row)),
  )
}

export function slugifyProductName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || `product-${Date.now()}`
}

export async function uploadProductCover(
  productRef: Pick<Product, 'id' | 'slug'>,
  file: File,
): Promise<Product> {
  const slug = productRef.slug
  if (!slug) throw new Error('شناسه محصول برای آپلود تصویر لازم است.')
  const form = new FormData()
  form.append('cover', file)
  const raw = await http.postForm<Dto>(`/admin/products/${slug}/cover`, form)
  const product = mapProduct(raw)
  useStore.getState().setProducts(
    useStore.getState().products.map((row) => (row.id === product.id ? product : row)),
  )
  return product
}

export async function removeProductCover(productRef: Pick<Product, 'id' | 'slug'>): Promise<Product> {
  const slug = productRef.slug
  if (!slug) throw new Error('شناسه محصول برای حذف تصویر لازم است.')
  const raw = await http.del<Dto>(`/admin/products/${slug}/cover`)
  const product = mapProduct(raw)
  useStore.getState().setProducts(
    useStore.getState().products.map((row) => (row.id === product.id ? product : row)),
  )
  return product
}
