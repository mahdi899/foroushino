import Link from 'next/link';
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleDashed,
  Hash,
  Pencil,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { AdminStudentTestimonial } from '@/lib/admin/commerceTypes';
import { TestimonialRowAvatar } from './TestimonialRowAvatar';

export function TestimonialMobileCard({ testimonial: t }: { testimonial: AdminStudentTestimonial }) {
  const hasMetric = Boolean(t.metric_value?.trim() || t.metric_label?.trim());

  return (
    <Link href={`/admin/commerce/testimonials/${t.id}`} className="admin-testimonial-card">
      <div className="admin-testimonial-card__glow" aria-hidden />

      <div className="admin-testimonial-card__head">
        <div className="admin-testimonial-card__avatar-wrap">
          <TestimonialRowAvatar name={t.name} portraitImage={t.portrait_image} />
          {t.is_active ? (
            <span className="admin-testimonial-card__active-dot" title="فعال" aria-hidden />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="admin-testimonial-card__name">{t.name}</p>
          <p className="admin-testimonial-card__role">{t.role || 'دانشجو'}</p>
          <div className="admin-testimonial-card__chips">
            <span className="admin-testimonial-card__chip admin-testimonial-card__chip--slug" dir="ltr">
              <Hash className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
              {t.slug}
            </span>
            <span className="admin-testimonial-card__chip">
              ترتیب {t.sort_order.toLocaleString('fa-IR')}
            </span>
          </div>
        </div>

        <span
          className={`admin-testimonial-card__status ${
            t.is_active
              ? 'admin-testimonial-card__status--active'
              : 'admin-testimonial-card__status--inactive'
          }`}
        >
          {t.is_active ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <CircleDashed className="h-3.5 w-3.5" aria-hidden />
          )}
          {t.is_active ? 'فعال' : 'غیرفعال'}
        </span>
      </div>

      <div className="admin-testimonial-card__transform">
        <div className="admin-testimonial-card__phase admin-testimonial-card__phase--before">
          <span className="admin-testimonial-card__phase-label">
            <TrendingUp className="h-3.5 w-3.5 rotate-180" aria-hidden />
            قبل
          </span>
          <p className="admin-testimonial-card__phase-text">{t.before_text}</p>
        </div>

        <span className="admin-testimonial-card__arrow" aria-hidden>
          <ArrowLeftRight className="h-4 w-4" />
        </span>

        <div className="admin-testimonial-card__phase admin-testimonial-card__phase--after">
          <span className="admin-testimonial-card__phase-label">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            بعد
          </span>
          <p className="admin-testimonial-card__phase-text">{t.after_text}</p>
        </div>
      </div>

      {hasMetric ? (
        <div className="admin-testimonial-card__metric">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
          <span className="min-w-0 truncate">
            {t.metric_value ? <strong dir="ltr">{t.metric_value}</strong> : null}
            {t.metric_value && t.metric_label ? ' · ' : null}
            {t.metric_label}
          </span>
        </div>
      ) : null}

      {t.summary ? (
        <p className="admin-testimonial-card__summary line-clamp-2">{t.summary}</p>
      ) : null}

      <span className="admin-testimonial-card__edit">
        <Pencil className="h-4 w-4" aria-hidden />
        ویرایش داستان
      </span>
    </Link>
  );
}
