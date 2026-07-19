'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardCheck, CreditCard, Loader2, Video } from 'lucide-react';
import { formatDateFa } from '@/lib/persian';
import { primeVideoElement } from '@/lib/media/recorder';
import { studentIdentityArtifactStreamUrl } from '@/lib/student/identityArtifacts';

const GENDER_FA: Record<string, string> = {
  male: 'مرد',
  female: 'زن',
};

type Draft = {
  first_name: string;
  last_name: string;
  national_code: string;
  date_of_birth: string;
  gender: string;
  city: string;
};

type Props = {
  draft: Draft;
  cardFile: File | null;
  cardReadyOnServer?: boolean;
  serverCardArtifactId?: number | null;
  videoBlob: Blob | null;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export function IdentityReviewStep({
  draft,
  cardFile,
  cardReadyOnServer = false,
  serverCardArtifactId = null,
  videoBlob,
  pending,
  onBack,
  onSubmit,
}: Props) {
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!cardFile) {
      setCardPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(cardFile);
    setCardPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cardFile]);

  useEffect(() => {
    if (!videoBlob) {
      setVideoPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(videoBlob);
    setVideoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoBlob]);

  useEffect(() => {
    if (!videoPreviewUrl || !reviewVideoRef.current) return;
    const video = reviewVideoRef.current;
    video.src = videoPreviewUrl;
    return primeVideoElement(video);
  }, [videoPreviewUrl]);

  const cardReady = Boolean(cardFile || cardReadyOnServer);

  const identityFields = [
    { key: 'name', label: 'نام و نام خانوادگی', value: `${draft.first_name} ${draft.last_name}`.trim() },
    { key: 'national_code', label: 'کد ملی', value: draft.national_code, dir: 'ltr' as const },
    {
      key: 'date_of_birth',
      label: 'تاریخ تولد',
      value: draft.date_of_birth ? formatDateFa(draft.date_of_birth) : '—',
    },
    { key: 'gender', label: 'جنسیت', value: (GENDER_FA[draft.gender] ?? draft.gender) || '—' },
    { key: 'city', label: 'شهر', value: draft.city || '—' },
  ];

  return (
    <div className="panel-identity-review">
      <div className="panel-identity-review__header">
        <span className="panel-identity-review__icon" aria-hidden>
          <ClipboardCheck size={20} strokeWidth={2} />
        </span>
        <div>
          <h3 className="panel-identity-review__title">بازبینی نهایی</h3>
          <p className="panel-identity-review__lead">
            قبل از ارسال، اطلاعات و مدارک را یک‌بار دیگر بررسی کنید. پس از ارسال، پرونده در صف بررسی قرار می‌گیرد.
          </p>
        </div>
      </div>

      <section className="panel-identity-review__section">
        <h4 className="panel-identity-review__section-title">اطلاعات هویتی</h4>
        <dl className="panel-identity-review__grid">
          {identityFields.map((field) => (
            <div key={field.key} className="panel-identity-review__field">
              <dt>{field.label}</dt>
              <dd dir={field.dir}>{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="panel-identity-review__section">
        <h4 className="panel-identity-review__section-title">مدارک بارگذاری‌شده</h4>
        <div className="panel-identity-review__artifacts">
          <article className="panel-identity-review__artifact">
            <div className="panel-identity-review__artifact-media">
              {cardPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cardPreviewUrl} alt="پیش‌نمایش کارت ملی" />
              ) : serverCardArtifactId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studentIdentityArtifactStreamUrl(serverCardArtifactId)}
                  alt="تصویر کارت ملی بارگذاری‌شده"
                />
              ) : cardReadyOnServer ? (
                <CheckCircle2 size={22} aria-hidden />
              ) : (
                <CreditCard size={22} aria-hidden />
              )}
            </div>
            <div className="panel-identity-review__artifact-copy">
              <p className="panel-identity-review__artifact-title">تصویر کارت ملی</p>
              <p className="panel-identity-review__artifact-status panel-identity-review__artifact-status--ok">
                <CheckCircle2 size={14} aria-hidden />
                آماده ارسال
              </p>
            </div>
          </article>

          <article className="panel-identity-review__artifact">
            <div className="panel-identity-review__artifact-media panel-identity-review__artifact-media--video">
              {videoPreviewUrl ? (
                <video ref={reviewVideoRef} muted playsInline preload="auto" controls />
              ) : (
                <Video size={22} aria-hidden />
              )}
            </div>
            <div className="panel-identity-review__artifact-copy">
              <p className="panel-identity-review__artifact-title">ویدیوی سلفی زنده</p>
              <p className="panel-identity-review__artifact-status panel-identity-review__artifact-status--ok">
                <CheckCircle2 size={14} aria-hidden />
                آماده ارسال
              </p>
            </div>
          </article>
        </div>
      </section>

      <div className="panel-identity-step__actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          قبلی
        </button>
        <button type="button" className="btn btn-primary" disabled={pending || !cardReady || !videoBlob} onClick={onSubmit}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ارسال برای بررسی
        </button>
      </div>
    </div>
  );
}
