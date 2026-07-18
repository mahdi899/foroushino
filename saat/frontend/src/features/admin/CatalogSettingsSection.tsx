import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, ImageIcon, Layers3, Plus, Trash2, Pencil, Upload } from 'lucide-react'
import { apiErrorMessage } from '@/lib/apiErrors'
import { cn } from '@/lib/cn'
import { intakeLeadSources, slugifyCatalogLabel } from '@/lib/leadSources'
import { toFa } from '@/lib/format'
import {
  createLeadSource,
  createProduct,
  deactivateLeadSource,
  deactivateProduct,
  fetchAdminLeadSources,
  fetchAdminProducts,
  slugifyProductName,
  updateLeadSource,
  updateProduct,
  uploadProductCover,
  removeProductCover,
} from '@/services/catalogAdminActions'
import type { LeadSourceOption, Product } from '@/types'
import { useStore } from '@/store/useStore'

const fieldClass = cn(
  'glass-inset w-full rounded-[14px] border border-white/55 px-3 py-3 text-[14px] font-semibold text-text',
  'outline-none focus:border-[#3390EC]/35 dark:border-white/10',
)

type ProductDraft = {
  name: string
  slug: string
  price: string
  commissionRate: string
  description: string
  videoUrl: string
  landingUrl: string
}

type SourceDraft = {
  label: string
  slug: string
  sortOrder: string
}

const emptyProductDraft = (): ProductDraft => ({
  name: '',
  slug: '',
  price: '',
  commissionRate: '12',
  description: '',
  videoUrl: '',
  landingUrl: '',
})

const emptySourceDraft = (): SourceDraft => ({
  label: '',
  slug: '',
  sortOrder: '80',
})

export function CatalogSettingsSection() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [sources, setSources] = useState<LeadSourceOption[]>([])
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyProductDraft)
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(emptySourceDraft)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const editingProduct = useMemo(
    () => (editingProductId ? products.find((product) => product.id === editingProductId) ?? null : null),
    [editingProductId, products],
  )

  const coverPreview = useMemo(() => {
    if (pendingCoverFile) return URL.createObjectURL(pendingCoverFile)
    return editingProduct?.coverImageUrl ?? null
  }, [pendingCoverFile, editingProduct?.coverImageUrl])

  useEffect(() => {
    if (!pendingCoverFile || !coverPreview?.startsWith('blob:')) return
    return () => URL.revokeObjectURL(coverPreview)
  }, [pendingCoverFile, coverPreview])

  const activeProducts = useMemo(() => products.filter((product) => product.isActive), [products])
  const intakeSources = useMemo(() => intakeLeadSources(sources), [sources])

  const loadCatalog = async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextProducts, nextSources] = await Promise.all([fetchAdminProducts(), fetchAdminLeadSources()])
      setProducts(nextProducts)
      setSources(nextSources)
      useStore.getState().setProducts(nextProducts.filter((product) => product.isActive))
      useStore.getState().setLeadSources(nextSources)
    } catch (err) {
      setError(apiErrorMessage(err, 'بارگذاری کاتالوگ ناموفق بود.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductDraft(emptyProductDraft())
    setPendingCoverFile(null)
  }

  const resetSourceForm = () => {
    setEditingSourceId(null)
    setSourceDraft(emptySourceDraft())
  }

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id)
    setProductDraft({
      name: product.name,
      slug: product.slug ?? slugifyProductName(product.name),
      price: String(product.price),
      commissionRate: String(product.commissionRate),
      description: product.description ?? '',
      videoUrl: product.videoUrl ?? '',
      landingUrl: product.landingUrl ?? '',
    })
    setPendingCoverFile(null)
  }

  const startEditSource = (source: LeadSourceOption) => {
    setEditingSourceId(source.id)
    setSourceDraft({
      label: source.label,
      slug: source.slug,
      sortOrder: String(source.sortOrder),
    })
  }

  const submitProduct = async () => {
    if (!productDraft.name.trim()) {
      setError('نام محصول را وارد کن.')
      return
    }
    const price = Number(productDraft.price)
    const commissionRate = Number(productDraft.commissionRate)
    if (!Number.isFinite(price) || price < 0) {
      setError('قیمت محصول معتبر نیست.')
      return
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      setError('نرخ پورسانت باید بین ۰ تا ۱۰۰ باشد.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const slug = productDraft.slug.trim() || slugifyProductName(productDraft.name)
      let saved: Product
      if (editingProductId) {
        saved = await updateProduct(editingProductId, {
          name: productDraft.name,
          slug,
          price,
          commissionRate,
          description: productDraft.description,
          videoUrl: productDraft.videoUrl,
          landingUrl: productDraft.landingUrl,
          isActive: true,
        })
      } else {
        saved = await createProduct({
          name: productDraft.name,
          slug,
          price,
          commissionRate,
          description: productDraft.description,
          videoUrl: productDraft.videoUrl,
          landingUrl: productDraft.landingUrl,
        })
      }

      if (pendingCoverFile) {
        saved = await uploadProductCover(saved, pendingCoverFile)
      }

      resetProductForm()
      await loadCatalog()
    } catch (err) {
      setError(apiErrorMessage(err, 'ذخیره محصول ناموفق بود.'))
    } finally {
      setBusy(false)
    }
  }

  const submitSource = async () => {
    if (!sourceDraft.label.trim()) {
      setError('عنوان منبع ورود را وارد کن.')
      return
    }
    const sortOrder = Number(sourceDraft.sortOrder || 0)
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setError('ترتیب نمایش معتبر نیست.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const slug = sourceDraft.slug.trim() || slugifyCatalogLabel(sourceDraft.label)
      if (editingSourceId) {
        const current = sources.find((source) => source.id === editingSourceId)
        await updateLeadSource(editingSourceId, {
          label: sourceDraft.label,
          slug: current?.isSystem ? undefined : slug,
          sortOrder,
          isActive: true,
          showInForm: true,
        })
      } else {
        await createLeadSource({
          label: sourceDraft.label,
          slug,
          sortOrder,
        })
      }
      resetSourceForm()
      await loadCatalog()
    } catch (err) {
      setError(apiErrorMessage(err, 'ذخیره منبع ورود ناموفق بود.'))
    } finally {
      setBusy(false)
    }
  }

  const removeCover = async () => {
    if (!editingProduct?.coverImageUrl) {
      setPendingCoverFile(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await removeProductCover(editingProduct)
      setPendingCoverFile(null)
      await loadCatalog()
    } catch (err) {
      setError(apiErrorMessage(err, 'حذف تصویر ناموفق بود.'))
    } finally {
      setBusy(false)
    }
  }

  const removeProduct = async (productId: string) => {
    setBusy(true)
    setError(null)
    try {
      await deactivateProduct(productId)
      if (editingProductId === productId) resetProductForm()
      await loadCatalog()
    } catch (err) {
      setError(apiErrorMessage(err, 'حذف محصول ناموفق بود.'))
    } finally {
      setBusy(false)
    }
  }

  const removeSource = async (source: LeadSourceOption) => {
    if (source.isSystem) {
      setError('منبع‌های پیش‌فرض سیستم قابل حذف نیستند.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deactivateLeadSource(source.id)
      if (editingSourceId === source.id) resetSourceForm()
      await loadCatalog()
    } catch (err) {
      setError(apiErrorMessage(err, 'حذف منبع ورود ناموفق بود.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 px-1 text-[12px] font-bold text-text-soft">
        <Layers3 size={13} />
        محصولات و منابع ورود
      </h2>
      <p className="px-1 text-[11px] font-semibold leading-5 text-text-muted">
        محصولات و منابع ورود فرم ثبت مشتری از اینجا مدیریت می‌شوند. لینک هر محصول در پیامک «لینک دوره» با کد
        معرفی کارشناس ارسال می‌شود. حذف، فقط گزینه را غیرفعال می‌کند.
      </p>

      {error && (
        <div className="rounded-[14px] border border-danger-200 bg-danger-50 px-3 py-2 text-[12px] font-bold text-danger-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-[20px] border border-white/55 p-4 text-[13px] font-semibold text-text-soft dark:border-white/10">
          در حال بارگذاری کاتالوگ…
        </div>
      ) : (
        <>
          <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-bold text-text">محصولات</p>
              <button
                type="button"
                onClick={resetProductForm}
                className="inline-flex items-center gap-1 rounded-[12px] bg-primary-600/10 px-2.5 py-1.5 text-[11px] font-extrabold text-primary-600"
              >
                <Plus size={13} />
                محصول جدید
              </button>
            </div>

            <div className="space-y-2">
              {activeProducts.length === 0 ? (
                <p className="text-[12px] font-semibold text-text-soft">محصول فعالی ثبت نشده است.</p>
              ) : (
                activeProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 rounded-[14px] border border-white/40 bg-white/25 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => product.slug && navigate(`/products/${product.slug}`)}
                        className="block w-full text-right"
                      >
                        <p className="truncate text-[13px] font-bold text-text">{product.name}</p>
                        <p className="text-[11px] font-semibold text-text-soft">
                          پورسانت {toFa(product.commissionRate)}٪
                          {product.landingUrl ? ' · لینک پیامک' : ''}
                        </p>
                      </button>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {product.slug ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => navigate(`/products/${product.slug}`)}
                          className="rounded-[10px] p-2 text-primary-600 hover:bg-primary-50"
                          aria-label="صفحه محصول"
                        >
                          <ExternalLink size={14} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditProduct(product)}
                        className="rounded-[10px] p-2 text-text-soft hover:bg-white/40"
                        aria-label="ویرایش محصول"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeProduct(product.id)}
                        className="rounded-[10px] p-2 text-danger-600 hover:bg-danger-50"
                        aria-label="حذف محصول"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-white/40 pt-3 dark:border-white/10">
              <p className="text-[12px] font-bold text-text-soft">
                {editingProductId ? 'ویرایش محصول' : 'افزودن محصول'}
              </p>
              <input
                value={productDraft.name}
                onChange={(e) =>
                  setProductDraft((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: prev.slug || slugifyProductName(e.target.value),
                  }))
                }
                placeholder="نام محصول"
                className={fieldClass}
              />
              <input
                value={productDraft.slug}
                onChange={(e) => setProductDraft((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="شناسه انگلیسی (slug)"
                className={cn(fieldClass, 'ltr-nums text-left')}
              />
              <textarea
                value={productDraft.description}
                onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="توضیحات کوتاه (صفحه محصول)"
                className={cn(fieldClass, 'resize-none leading-relaxed')}
              />
              <div className="space-y-2">
                <span className="block text-[12px] font-bold text-text-soft">تصویر محصول</span>
                <div className="overflow-hidden rounded-[14px] border border-white/40 bg-white/20 dark:border-white/10 dark:bg-white/5">
                  {coverPreview ? (
                    <img src={coverPreview} alt="" className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/10] flex-col items-center justify-center gap-1.5 text-text-soft">
                      <ImageIcon size={28} strokeWidth={1.5} />
                      <span className="text-[11px] font-semibold">تصویر انتخاب نشده</span>
                    </div>
                  )}
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setPendingCoverFile(file)
                    e.target.value = ''
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-primary-600/10 py-2.5 text-[12px] font-extrabold text-primary-600 disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {coverPreview ? 'تغییر تصویر' : 'انتخاب تصویر'}
                  </button>
                  {coverPreview ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeCover()}
                      className="inline-flex items-center justify-center rounded-[14px] border border-danger-200 px-3 text-danger-600 disabled:opacity-50"
                      aria-label="حذف تصویر"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
                <p className="text-[10px] font-semibold leading-5 text-text-muted">
                  JPG، PNG یا WebP — بعد از ذخیره محصول آپلود می‌شود.
                </p>
              </div>
              <input
                value={productDraft.videoUrl}
                onChange={(e) => setProductDraft((prev) => ({ ...prev, videoUrl: e.target.value }))}
                placeholder="لینک ویدیو — آپارات/یوتیوب یا مسیر داخلی مثل /storage/videos/intro.mp4"
                className={cn(fieldClass, 'ltr-nums text-left')}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={productDraft.price}
                  onChange={(e) => setProductDraft((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="قیمت (تومان)"
                  className={fieldClass}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={productDraft.commissionRate}
                  onChange={(e) => setProductDraft((prev) => ({ ...prev, commissionRate: e.target.value }))}
                  placeholder="پورسانت (٪)"
                  className={fieldClass}
                />
              </div>
              <input
                value={productDraft.landingUrl}
                onChange={(e) => setProductDraft((prev) => ({ ...prev, landingUrl: e.target.value }))}
                placeholder="لینک پیامک — آدرس کامل یا مسیر داخلی مثل /courses/sales"
                className={cn(fieldClass, 'ltr-nums text-left')}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitProduct()}
                className="w-full rounded-[14px] bg-primary-600 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {editingProductId ? 'ذخیره تغییرات محصول' : 'افزودن محصول'}
              </button>
            </div>
          </div>

          <div className="glass-card space-y-3 rounded-[20px] border border-white/55 p-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-bold text-text">منابع ورود</p>
              <button
                type="button"
                onClick={resetSourceForm}
                className="inline-flex items-center gap-1 rounded-[12px] bg-primary-600/10 px-2.5 py-1.5 text-[11px] font-extrabold text-primary-600"
              >
                <Plus size={13} />
                منبع جدید
              </button>
            </div>

            <div className="space-y-2">
              {intakeSources.length === 0 ? (
                <p className="text-[12px] font-semibold text-text-soft">منبع فعالی برای فرم ثبت مشتری نیست.</p>
              ) : (
                intakeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between gap-2 rounded-[14px] border border-white/40 bg-white/25 px-3 py-2.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-text">{source.label}</p>
                      <p className="text-[11px] font-semibold text-text-soft">
                        {source.isSystem ? 'پیش‌فرض سیستم' : 'سفارشی'} · ترتیب {toFa(source.sortOrder)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startEditSource(source)}
                        className="rounded-[10px] p-2 text-text-soft hover:bg-white/40"
                        aria-label="ویرایش منبع"
                      >
                        <Pencil size={14} />
                      </button>
                      {!source.isSystem && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeSource(source)}
                          className="rounded-[10px] p-2 text-danger-600 hover:bg-danger-50"
                          aria-label="حذف منبع"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 border-t border-white/40 pt-3 dark:border-white/10">
              <p className="text-[12px] font-bold text-text-soft">
                {editingSourceId ? 'ویرایش منبع ورود' : 'افزودن منبع ورود'}
              </p>
              <input
                value={sourceDraft.label}
                onChange={(e) =>
                  setSourceDraft((prev) => ({
                    ...prev,
                    label: e.target.value,
                    slug: prev.slug || slugifyCatalogLabel(e.target.value),
                  }))
                }
                placeholder="عنوان منبع (مثلاً اینستاگرام)"
                className={fieldClass}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={sourceDraft.slug}
                  onChange={(e) => setSourceDraft((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="شناسه انگلیسی"
                  disabled={!!editingSourceId && sources.find((s) => s.id === editingSourceId)?.isSystem}
                  className={cn(fieldClass, 'ltr-nums text-left disabled:opacity-60')}
                />
                <input
                  type="number"
                  min={0}
                  value={sourceDraft.sortOrder}
                  onChange={(e) => setSourceDraft((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  placeholder="ترتیب نمایش"
                  className={fieldClass}
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitSource()}
                className="w-full rounded-[14px] bg-primary-600 py-2.5 text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {editingSourceId ? 'ذخیره تغییرات منبع' : 'افزودن منبع ورود'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
