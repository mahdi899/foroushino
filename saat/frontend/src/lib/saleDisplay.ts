import type { Lead, Product, Sale } from '@/types'

export function saleCustomerName(sale: Sale, lead?: Lead): string | null {
  if (lead) {
    const name = `${lead.firstName} ${lead.lastName}`.trim()
    if (name) return name
  }
  const embedded = sale.leadName?.trim()
  return embedded || null
}

export function saleProductName(sale: Sale, product?: Product): string | null {
  const name = (sale.productName ?? product?.name ?? '').trim()
  return name || null
}

export function isSaleDisplayable(sale: Sale, lead?: Lead, product?: Product): boolean {
  return !!saleCustomerName(sale, lead) && !!saleProductName(sale, product)
}
