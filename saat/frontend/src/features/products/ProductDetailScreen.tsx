import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImageIcon, Package, Percent, Pencil, Trash2, Upload, Video } from 'lucide-react'
import { Page } from '@/components/layout/Page'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { useStore } from '@/store/useStore'
import { hasPermission } from '@/lib/permissions'
import { apiErrorMessage } from '@/lib/apiErrors'
import { cn } from '@/lib/cn'
import { toFa, formatMoney } from '@/lib/format'
import { formatProductPrice, isDirectVideoFile, resolveVideoEmbedUrl } from '@/lib/productMedia'
import { computeCommission } from '@/services/logic'
import { fetchProduct } from '@/services/products'
import {
  removeProductCover,
  updateProduct,
  uploadProductCover,
} from '@/services/catalogAdminActions'
import { resolveProductFromStore } from '@/components/domain/ProductLink'
import type { Product } from '@/types'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

export function ProductDetailScreen() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const products = useStore((s) => s.products)
  const permissions = useStore((s) => s.permissions)
  const pushToast = useStore((s) => s.pushToast)
  const setProducts = useStore((s) => s.setProducts)

  const canEdit = hasPermission(permissions, 'admin.products') || hasPermission(permissions, 'admin.settings')
  const cached = useMemo(
    () => resolveProductFromStore(products, { slug }),
    [products, slug],
  )

  const [product, setProduct] = useState<Product | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached)
  const [editOpen, setEditOpen] = useState(false)
  const [description, setDescription] = useState(cached?.description ?? '')
  const [videoUrl, setVideoUrl] = useState(cached?.videoUrl ?? '')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    fetchProduct(slug)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setDescription(data.description ?? '')
        setVideoUrl(data.videoUrl ?? '')
        const current = useStore.getState().products
        setProducts([...current.filter((row) => row.id !== data.id), data])
      })
      .catch((error) => {
        if (!cancelled) pushToast(apiErrorMessage(error, 'بارگذاری محصول ناموفق بود.'), 'error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, pushToast, setProducts])

  const embedUrl = resolveVideoEmbedUrl(product?.videoUrl)
  const directVideo = isDirectVideoFile(product?.videoUrl)
  const commissionAmount = product && product.price > 0 ? computeCommission(product, product.price) : null

  const saveContent = async () => {
    if (!product) return
    setBusy(true)
    try {
      const updated = await updateProduct(product.id, {
        description: description.trim(),
        videoUrl: videoUrl.trim() || undefined,
      })
      setProduct(updated)
      pushToast('محتوای محصول ذخیره شد.', 'success')
      setEditOpen(false)
    } catch (error) {
      pushToast(apiErrorMessage(error, 'ذخیره محصول ناموفق بود.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onPickCover = async (file: File) => {
    if (!product) return
    setBusy(true)
    try {
      const updated = await uploadProductCover(product, file)
      setProduct(updated)
      pushToast('تصویر محصول به‌روزرسانی شد.', 'success')
    } catch (error) {
      pushToast(apiErrorMessage(error, 'آپلود تصویر ناموفق بود.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const onRemoveCover = async () => {
    if (!product?.coverImageUrl) return
    setBusy(true)
    try {
      const updated = await removeProductCover(product)
      setProduct(updated)
      pushToast('تصویر محصول حذف شد.', 'success')
    } catch (error) {
      pushToast(apiErrorMessage(error, 'حذف تصویر ناموفق بود.'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading && !product) {
    return (
      <Page withNav={false}>
        <ScreenHeader sticky showBack title="محصول" icon={Package} iconTone="primary" />
        <div className="px-4 py-10 text-center text-[13px] font-semibold text-text-soft">در حال بارگذاری…</div>
      </Page>
    )
  }

  if (!product) {
    return (
      <Page withNav={false}>
        <ScreenHeader sticky showBack title="محصول" icon={Package} iconTone="primary" />
        <div className="px-4 py-10 text-center text-[13px] font-semibold text-text-soft">محصول یافت نشد.</div>
      </Page>
    )
  }

  return (
    <Page withNav={false}>
      <ScreenHeader sticky showBack title={product.name} icon={Package} iconTone="primary" />

      <div className="space-y-4 px-4 pb-24 pt-2">
        <section className="glass-card overflow-hidden rounded-[24px] border border-white/55 dark:border-white/10">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-primary-500/15 via-[#3390EC]/10 to-transparent">
            {product.coverImageUrl ? (
              <img
                src={product.coverImageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-text-soft">
                <ImageIcon size={42} strokeWidth={1.5} />
                <span className="text-[12px] font-semibold">تصویر محصول ثبت نشده</span>
              </div>
            )}
          </div>

          <div className="space-y-3 p-4">
            {product.category ? (
              <span className="inline-flex rounded-full bg-primary-600/10 px-2.5 py-1 text-[11px] font-extrabold text-primary-600">
                {product.category}
              </span>
            ) : null}
            <h1 className="text-[20px] font-black leading-8 text-text">{product.name}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="glass-inset rounded-[12px] px-3 py-2 text-[12px] font-bold text-text">
                قیمت: {formatProductPrice(product.price)}
              </span>
              <span className="glass-inset inline-flex items-center gap-1 rounded-[12px] px-3 py-2 text-[12px] font-bold text-primary-600">
                <Percent size={13} />
                پورسانت {toFa(product.commissionRate)}٪
              </span>
              {commissionAmount != null && commissionAmount > 0 ? (
                <span className="glass-inset rounded-[12px] px-3 py-2 text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
                  پورسانت ش: {formatMoney(commissionAmount)} تومان
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {product.description ? (
          <section className="glass-card space-y-2 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <h2 className="text-[14px] font-extrabold text-text">توضیحات</h2>
            <p className="whitespace-pre-wrap text-[13px] font-semibold leading-7 text-text-soft">
              {product.description}
            </p>
          </section>
        ) : (
          <section className="glass-card rounded-[20px] border border-dashed border-white/55 p-4 text-[12px] font-semibold text-text-soft dark:border-white/10">
            هنوز توضیحاتی برای این محصول ثبت نشده است.
          </section>
        )}

        {embedUrl ? (
          <section className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-text">
              <Video size={16} />
              ویدیو معرفی
            </h2>
            <div className="overflow-hidden rounded-[16px] border border-white/40 bg-black dark:border-white/10">
              <div className="relative aspect-video w-full">
                {directVideo ? (
                  <video
                    src={embedUrl}
                    controls
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                ) : (
                  <iframe
                    src={embedUrl}
                    title={`ویدیو ${product.name}`}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {canEdit ? (
          <section className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <button
              type="button"
              onClick={() => setEditOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-text">
                <Pencil size={15} />
                ویرایش محتوای محصول
              </span>
              <span className="text-[11px] font-bold text-text-soft">{editOpen ? 'بستن' : 'باز کردن'}</span>
            </button>

            {editOpen ? (
              <div className="space-y-3 border-t border-white/40 pt-3 dark:border-white/10">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-bold text-text-soft">توضیحات</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className={cn(fieldClass, 'resize-none leading-relaxed')}
                    placeholder="معرفی کامل دوره، مزایا، پیش‌نیازها…"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-bold text-text-soft">لینک ویدیو</span>
                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="لینک آپارات، یوتیوب، یا مسیر داخلی مثل /storage/videos/intro.mp4"
                    className={cn(fieldClass, 'ltr-nums text-left')}
                  />
                </label>

                <div className="space-y-2">
                  <span className="block text-[12px] font-bold text-text-soft">تصویر کاور</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void onPickCover(file)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-primary-600 py-2.5 text-[12px] font-extrabold text-white disabled:opacity-50"
                    >
                      <Upload size={14} />
                      آپلود تصویر
                    </button>
                    {product.coverImageUrl ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRemoveCover()}
                        className="inline-flex items-center justify-center rounded-[14px] border border-danger-200 px-3 text-danger-600"
                        aria-label="حذف تصویر"
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveContent()}
                  className="w-full rounded-[14px] bg-primary-600 py-3 text-[13px] font-extrabold text-white disabled:opacity-50"
                >
                  {busy ? 'در حال ذخیره…' : 'ذخیره محتوا'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/catalog')}
                  className="w-full rounded-[14px] border border-white/50 py-2.5 text-[12px] font-bold text-text-soft dark:border-white/10"
                >
                  ویرایش قیمت، لینک پیامک و پورسانت
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </Page>
  )
}
