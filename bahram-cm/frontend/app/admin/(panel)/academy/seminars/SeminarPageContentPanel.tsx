'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, ImageIcon, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { CoverImageField } from '@/app/admin/(panel)/content/CoverImageField';
import { ImageGalleryModal } from '@/app/admin/(panel)/content/ImageGalleryModal';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { updateSeminar } from '../actions';
import { cn } from '@/lib/cn';
import { persistMediaUrl, resolveMediaUrl } from '@/lib/mediaUrl';
import type {
  AdminSeminarDetail,
  AdminSeminarGalleryItem,
  AdminSeminarSliderItem,
} from '@/lib/admin/academyTypes';

type SeminarPageContentPanelProps = {
  seminar: AdminSeminarDetail;
};

type DraftItem = AdminSeminarGalleryItem;
type DraftSliderItem = AdminSeminarSliderItem;

const SLIDER_MAX = 6;

const emptyItem = (): DraftItem => ({
  type: 'image',
  aspect: '16:9',
  src: '',
  alt: '',
  poster: '',
});

const emptySliderItem = (): DraftSliderItem => ({
  src: '',
  alt: '',
});

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface-soft p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-caption transition',
              active
                ? 'bg-surface font-semibold text-primary-dark shadow-sm'
                : 'text-text-muted hover:text-text',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

type PickerTarget =
  | { kind: 'gallery'; index: number; field: 'src' | 'poster' }
  | { kind: 'slider'; index: number };

export function SeminarPageContentPanel({ seminar }: SeminarPageContentPanelProps) {
  const router = useRouter();
  const [description, setDescription] = useState(seminar.description ?? '');
  const [coverImage, setCoverImage] = useState(seminar.cover_image ?? '');
  const [coverImageMobile, setCoverImageMobile] = useState(seminar.cover_image_mobile ?? '');
  const [isEnded, setIsEnded] = useState(Boolean(seminar.is_ended));
  const [gallery, setGallery] = useState<DraftItem[]>(
    (seminar.gallery ?? []).map((item) => ({
      type: item.type,
      aspect: item.aspect,
      src: item.src ?? '',
      alt: item.alt ?? '',
      poster: item.poster ?? '',
    })),
  );
  const [slider, setSlider] = useState<DraftSliderItem[]>(
    (seminar.gallery_slider ?? []).map((item) => ({
      src: item.src ?? '',
      alt: item.alt ?? '',
    })),
  );
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setGallery((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSliderItem(index: number, patch: Partial<DraftSliderItem>) {
    setSlider((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeSliderItem(index: number) {
    setSlider((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setMessage('');

    const cleanedGallery = gallery
      .filter((item) => item.src.trim())
      .map((item) => ({
        type: item.type,
        aspect: item.aspect,
        src: persistMediaUrl(item.src) || item.src,
        alt: item.alt?.trim() || null,
        poster: item.poster?.trim() ? persistMediaUrl(item.poster) || item.poster : null,
      }));

    const cleanedSlider = slider
      .filter((item) => item.src.trim())
      .slice(0, SLIDER_MAX)
      .map((item) => ({
        src: persistMediaUrl(item.src) || item.src,
        alt: item.alt?.trim() || null,
      }));

    const res = await updateSeminar(seminar.id, {
      description: description || null,
      cover_image: coverImage || null,
      cover_image_mobile: coverImageMobile || null,
      is_ended: isEnded,
      gallery: cleanedGallery,
      gallery_slider: cleanedSlider,
    });

    setPending(false);
    if (res.ok) {
      setMessage('صفحه سمینار ذخیره شد.');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  const pickerValue = (() => {
    if (!picker) return '';
    if (picker.kind === 'gallery') {
      const item = gallery[picker.index];
      return resolveMediaUrl(picker.field === 'poster' ? item?.poster ?? '' : item?.src ?? '');
    }
    return resolveMediaUrl(slider[picker.index]?.src ?? '');
  })();

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-h3 text-primary-dark">صفحه عمومی سمینار</h2>
        <p className="mt-1 text-small text-text-muted">
          توضیحات و تصویر شاخص صفحه‌ای که کاربر پس از کلیک روی بنر می‌بیند.
        </p>
        {seminar.status === 'published' ? (
          <p className="mt-2 text-small">
            لینک عمومی:{' '}
            <Link href={`/seminars/${seminar.slug}`} className="text-primary hover:underline" target="_blank">
              /seminars/{seminar.slug}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-caption text-text-muted">پس از انتشار سمینار، این صفحه برای عموم قابل مشاهده است.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-soft p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-small font-semibold text-primary-dark">اتمام سمینار</p>
            <p className="mt-1 text-caption text-text-muted">
              بعد از برگزاری، ثبت‌نام بسته می‌شود و صفحه به گالری ۱۶:۹ / ۹:۱۶ تغییر می‌کند.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-small">
            <input
              type="checkbox"
              checked={isEnded}
              onChange={(e) => {
                const next = e.target.checked;
                setIsEnded(next);
                if (next && gallery.length === 0) {
                  setGallery([emptyItem()]);
                }
              }}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            سمینار تمام شده
          </label>
        </div>
      </div>

      <CoverImageField
        label="تصویر هیرو — دسکتاپ (افقی)"
        value={coverImage}
        onChange={setCoverImage}
        alt={`${seminar.title} — هیرو دسکتاپ`}
      />
      <CoverImageField
        label="تصویر هیرو — موبایل (۹:۱۶)"
        value={coverImageMobile}
        onChange={setCoverImageMobile}
        alt={`${seminar.title} — هیرو موبایل`}
      />
      <p className="text-caption text-text-muted">
        اگر تصویر موبایل خالی باشد، همان تصویر دسکتاپ در موبایل نمایش داده می‌شود.
      </p>

      <label>
        <span className="field-label">توضیحات سمینار</span>
        <textarea
          rows={10}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="field-input min-h-[12rem] resize-y"
          placeholder="معرفی سمینار، سرفصل‌ها، مخاطبان هدف و…"
        />
        <span className="mt-1 block text-caption text-text-muted">می‌توانید از HTML ساده (مثل p، strong، ul) استفاده کنید.</span>
      </label>

      {isEnded ? (
        <>
          <div className="space-y-4 rounded-xl border border-border bg-surface-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-small font-semibold text-primary-dark">گالری بنتو</h3>
                <p className="mt-1 text-caption text-text-muted">
                  چیدمان اصلی صفحه — عکس و ویدیو با نسبت ۱۶:۹ یا ۹:۱۶.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setGallery((prev) => [...prev, emptyItem()])}
              >
                <Plus className="h-4 w-4" />
                افزودن
              </button>
            </div>

            {gallery.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-caption text-text-muted">
                هنوز آیتمی اضافه نشده است.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {gallery.map((item, index) => {
                  const previewSrc = item.type === 'video' ? item.poster || item.src : item.src;
                  const isPortrait = item.aspect === '9:16';
                  return (
                    <li
                      key={`gallery-${index}`}
                      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
                    >
                      <div
                        className={cn(
                          'relative overflow-hidden bg-surface-soft',
                          isPortrait ? 'aspect-[9/16] max-h-56' : 'aspect-video',
                        )}
                      >
                        {previewSrc ? (
                          <DirectMediaImg
                            admin
                            src={previewSrc}
                            alt={item.alt || ''}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                            {item.type === 'video' ? (
                              <Film className="h-6 w-6 opacity-50" />
                            ) : (
                              <ImageIcon className="h-6 w-6 opacity-50" />
                            )}
                            <span className="text-caption">بدون رسانه</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
                          <span className="rounded-md bg-black/65 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur-sm">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            className="rounded-md bg-black/65 p-1.5 text-white/90 backdrop-blur-sm transition hover:bg-error hover:text-white"
                            onClick={() => removeItem(index)}
                            aria-label="حذف آیتم"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {item.type === 'video' ? (
                          <span className="absolute bottom-2 start-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[0.65rem] text-white backdrop-blur-sm">
                            <Film className="h-3 w-3" />
                            ویدیو
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-1 flex-col gap-2.5 p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Segmented
                            value={item.type}
                            onChange={(type) => updateItem(index, { type })}
                            options={[
                              { value: 'image', label: 'عکس' },
                              { value: 'video', label: 'ویدیو' },
                            ]}
                          />
                          <Segmented
                            value={item.aspect}
                            onChange={(aspect) => updateItem(index, { aspect })}
                            options={[
                              { value: '16:9', label: '۱۶:۹' },
                              { value: '9:16', label: '۹:۱۶' },
                            ]}
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary flex-1 !px-2 !py-1.5 text-caption"
                            onClick={() => setPicker({ kind: 'gallery', index, field: 'src' })}
                          >
                            <ImageIcon className="h-3.5 w-3.5" />
                            {item.src ? 'رسانه' : 'انتخاب'}
                          </button>
                          {item.type === 'video' ? (
                            <button
                              type="button"
                              className="btn btn-ghost !px-2 !py-1.5 text-caption"
                              onClick={() => setPicker({ kind: 'gallery', index, field: 'poster' })}
                            >
                              پوستر
                            </button>
                          ) : null}
                        </div>

                        <input
                          className="field-input !py-1.5 text-caption"
                          value={item.alt ?? ''}
                          onChange={(e) => updateItem(index, { alt: e.target.value })}
                          placeholder="متن جایگزین"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-surface-soft p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-small font-semibold text-primary-dark">اسلایدر ۱۶:۹</h3>
                <p className="mt-1 text-caption text-text-muted">
                  زیر گالری نمایش داده می‌شود — حداکثر {SLIDER_MAX} عکس، دسکتاپ ۳تایی / موبایل ۱تایی، اسکرول خودکار.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={slider.length >= SLIDER_MAX}
                onClick={() => setSlider((prev) => (prev.length >= SLIDER_MAX ? prev : [...prev, emptySliderItem()]))}
              >
                <Plus className="h-4 w-4" />
                افزودن ({slider.length}/{SLIDER_MAX})
              </button>
            </div>

            {slider.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-caption text-text-muted">
                اسلایدری تنظیم نشده — در این صورت زیر گالری چیزی نشان داده نمی‌شود.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {slider.map((item, index) => (
                  <li
                    key={`slider-${index}`}
                    className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
                  >
                    <div className="relative aspect-video overflow-hidden bg-surface-soft">
                      {item.src ? (
                        <DirectMediaImg
                          admin
                          src={item.src}
                          alt={item.alt || ''}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
                          <ImageIcon className="h-6 w-6 opacity-50" />
                          <span className="text-caption">بدون عکس</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
                        <span className="rounded-md bg-black/65 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur-sm">
                          {index + 1}
                        </span>
                        <button
                          type="button"
                          className="rounded-md bg-black/65 p-1.5 text-white/90 backdrop-blur-sm transition hover:bg-error hover:text-white"
                          onClick={() => removeSliderItem(index)}
                          aria-label="حذف اسلاید"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      <button
                        type="button"
                        className="btn btn-secondary w-full !px-2 !py-1.5 text-caption"
                        onClick={() => setPicker({ kind: 'slider', index })}
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        {item.src ? 'تغییر عکس' : 'انتخاب از گالری'}
                      </button>
                      <input
                        className="field-input !py-1.5 text-caption"
                        value={item.alt ?? ''}
                        onChange={(e) => updateSliderItem(index, { alt: e.target.value })}
                        placeholder="متن جایگزین"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          ذخیره صفحه
        </button>
        {message && <p className="text-small text-success">{message}</p>}
        {error && <p className="text-small text-error">{error}</p>}
      </div>

      <ImageGalleryModal
        open={picker !== null}
        onClose={() => setPicker(null)}
        value={pickerValue}
        onSelect={(url) => {
          if (!picker) return;
          const persisted = persistMediaUrl(url) || url;
          if (picker.kind === 'gallery') {
            updateItem(picker.index, picker.field === 'poster' ? { poster: persisted } : { src: persisted });
          } else {
            updateSliderItem(picker.index, { src: persisted });
          }
          setPicker(null);
        }}
        title={
          picker?.kind === 'gallery' && picker.field === 'poster'
            ? 'انتخاب پوستر ویدیو'
            : picker?.kind === 'slider'
              ? 'انتخاب عکس اسلایدر'
              : 'انتخاب رسانه گالری'
        }
      />
    </form>
  );
}
