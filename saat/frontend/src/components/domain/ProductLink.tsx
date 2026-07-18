import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Product } from '@/types'
import { cn } from '@/lib/cn'

type ProductLinkProps = {
  product?: Product | null
  productId?: string | null
  slug?: string | null
  children: ReactNode
  className?: string
  showChevron?: boolean
}

export function ProductLink({
  product,
  productId,
  slug,
  children,
  className,
  showChevron = false,
}: ProductLinkProps) {
  const navigate = useNavigate()
  const products = useStore((s) => s.products)

  const resolved =
    product ??
    products.find((row) => row.id === productId || row.slug === slug) ??
    (slug ? ({ slug } as Product) : null)

  const targetSlug = resolved?.slug

  if (!targetSlug) {
    return <span className={className}>{children}</span>
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/products/${targetSlug}`)}
      className={cn(
        'inline-flex max-w-full items-center gap-1 text-left transition-opacity hover:opacity-80',
        className,
      )}
    >
      <span className="truncate">{children}</span>
      {showChevron ? <ChevronLeft size={14} className="shrink-0 opacity-60" /> : null}
    </button>
  )
}

export function resolveProductFromStore(
  products: Product[],
  options: { productId?: string | null; slug?: string | null; name?: string | null },
): Product | undefined {
  if (options.productId) {
    const byId = products.find((row) => row.id === options.productId)
    if (byId) return byId
  }
  if (options.slug) {
    const bySlug = products.find((row) => row.slug === options.slug)
    if (bySlug) return bySlug
  }
  if (options.name) {
    return products.find((row) => row.name === options.name)
  }
  return undefined
}
