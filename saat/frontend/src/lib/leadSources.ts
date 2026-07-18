import type { LeadSourceOption } from '@/types'
import { sourceLabels } from '@/data/labels'

export const DEFAULT_LEAD_SOURCES: LeadSourceOption[] = [
  { id: 'ls-instagram', slug: 'instagram', label: 'اینستاگرام', sortOrder: 10, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-website', slug: 'website', label: 'سایت', sortOrder: 20, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-telegram', slug: 'telegram', label: 'تلگرام', sortOrder: 30, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-ads', slug: 'ads', label: 'تبلیغات', sortOrder: 40, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-webinar', slug: 'webinar', label: 'وبینار', sortOrder: 50, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-form', slug: 'form', label: 'فرم ثبت‌نام', sortOrder: 60, isActive: true, isSystem: true, showInForm: true },
  { id: 'ls-excel', slug: 'excel', label: 'اکسل وارد شده', sortOrder: 70, isActive: true, isSystem: true, showInForm: true },
]

export function intakeLeadSources(sources: LeadSourceOption[]): LeadSourceOption[] {
  return sources
    .filter((source) => source.isActive && source.showInForm)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'fa'))
}

export function getSourceLabel(slug: string, sources: LeadSourceOption[] = []): string {
  const fromCatalog = sources.find((source) => source.slug === slug)?.label
  if (fromCatalog) return fromCatalog
  return sourceLabels[slug as keyof typeof sourceLabels] ?? slug
}

export function slugifyCatalogLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || `source-${Date.now()}`
}
