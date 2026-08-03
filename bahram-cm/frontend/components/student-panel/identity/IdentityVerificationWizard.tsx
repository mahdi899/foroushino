'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, UserRound } from 'lucide-react';
import { JalaliWheelDateField } from '@/components/ui/JalaliWheelDateField';
import { PanelCitySheetField } from '@/components/ui/PanelCitySheetField';
import { PanelOptionSheetField } from '@/components/ui/PanelOptionSheetField';
import { IdentityVerificationFeedback } from './IdentityVerificationFeedback';
import { IdentityStepLoading } from './IdentityStepLoading';
import { SelfieMobileHandoff } from './SelfieMobileHandoff';
import { uploadIdentityArtifactClient } from '@/lib/student/identityArtifactUpload';
import {
  saveIdentityDraftAction,
  submitIdentityVerificationAction,
} from '@/lib/student/identityActions';
import { identityStatusLabel, identityCorrectionLabel, IDENTITY_GENDER_OPTIONS } from '@/lib/student/identityLabels';
import { getIranNationalCodeInputError } from '@/lib/iran/nationalCode';
import { sanitizeLatinDigits } from '@/lib/persian';
import {
  sanitizePersianNameInput,
  PERSIAN_NAME_ONLY_ERROR,
} from '@/lib/persian/persianName';
import { PERSIAN_CITY_ONLY_ERROR } from '@/lib/persian/persianCity';
import {
  getIdentityStep1FieldErrors,
  IDENTITY_CLIENT_ERRORS,
  IDENTITY_CLIENT_ERROR_TITLES,
  IDENTITY_ERROR_TITLE_BY_CODE,
  IDENTITY_STEP1_FIELDS,
  type IdentityStep1Field,
  validateIdentityStep1,
} from '@/lib/student/identityVerificationErrors';
import { SELFIE_VIDEO_MAX_BYTES, selfieVideoFileName } from '@/lib/media/recorder';
import { optimizeNationalCardImage } from '@/lib/media/optimizeNationalCardImage';
import { optimizeSelfieVideo, pickSmallerVideoBlob } from '@/lib/media/optimizeSelfieVideo';
import {
  MAX_IDENTITY_AGE,
  maxBirthDateForMinAge,
  MIN_IDENTITY_AGE,
  minBirthDateForMaxAge,
} from '@/lib/student/age';
import { IdentityReviewStep } from './IdentityReviewStep';
import { useIsPhoneClient } from '@/lib/device/useIsPhoneClient';
import { cn } from '@/lib/cn';
import {
  clearIdentityDraftSession,
  readIdentityDraftSession,
  writeIdentityDraftSession,
} from '@/lib/student/identityDraftSession';

const NationalCardUploadStep = dynamic(
  () => import('./NationalCardUploadStep').then((mod) => mod.NationalCardUploadStep),
  { loading: () => <IdentityStepLoading label="در حال بارگذاری مرحله کارت ملی…" /> },
);

const LiveSelfieVideoStep = dynamic(
  () => import('./LiveSelfieVideoStep').then((mod) => mod.LiveSelfieVideoStep),
  { loading: () => <IdentityStepLoading label="در حال بارگذاری مرحله سلفی…" /> },
);

const STEPS = ['اطلاعات هویتی', 'تصویر کارت ملی', 'ویدیوی سلفی زنده', 'بازبینی و ارسال'] as const;
const STEP_LABELS_SHORT = ['اطلاعات', 'کارت ملی', 'سلفی', 'بازبینی'] as const;

type Draft = {
  first_name: string;
  last_name: string;
  national_code: string;
  date_of_birth: string;
  gender: string;
  city: string;
};

export function IdentityVerificationWizard({
  initialStatus,
  initialCanSubmit = true,
  initialDraft,
  correctionItems,
  initialStep = 0,
  cardUploadedOnServer = false,
  serverCardArtifactId = null,
  draftSubmissionId = null,
  accountMobile = null,
}: {
  initialStatus?: string | null;
  initialCanSubmit?: boolean;
  initialDraft?: Partial<Draft> | null;
  correctionItems?: string[] | null;
  initialStep?: number;
  cardUploadedOnServer?: boolean;
  serverCardArtifactId?: number | null;
  draftSubmissionId?: number | null;
  accountMobile?: string | null;
}) {
  const router = useRouter();
  const isPhone = useIsPhoneClient();
  const [step, setStep] = useState(() => Math.min(Math.max(initialStep, 0), STEPS.length - 1));
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    first_name: initialDraft?.first_name ?? '',
    last_name: initialDraft?.last_name ?? '',
    national_code: initialDraft?.national_code ?? '',
    date_of_birth: initialDraft?.date_of_birth ?? '',
    gender: initialDraft?.gender ?? '',
    city: initialDraft?.city ?? '',
  });
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [cardReadyOnServer, setCardReadyOnServer] = useState(cardUploadedOnServer);
  const [activeCardArtifactId, setActiveCardArtifactId] = useState<number | null>(serverCardArtifactId);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState('ارسال برای بررسی');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [step1FieldErrors, setStep1FieldErrors] = useState<Partial<Record<IdentityStep1Field, string>>>({});
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(draftSubmissionId);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [step1Pending, setStep1Pending] = useState(false);
  const [cardStepPending, setCardStepPending] = useState(false);
  const [cardUploadProgress, setCardUploadProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const resumeStepFromSession = useRef(initialStep === 0);
  const maxBirthDate = useMemo(() => maxBirthDateForMinAge(MIN_IDENTITY_AGE), []);
  const minBirthDate = useMemo(() => minBirthDateForMaxAge(MAX_IDENTITY_AGE), []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('.panel-main-content');
    main?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    const session = readIdentityDraftSession();
    if (session?.draft) {
      setDraft((current) => ({
        first_name: session.draft.first_name || current.first_name,
        last_name: session.draft.last_name || current.last_name,
        national_code: session.draft.national_code || current.national_code,
        date_of_birth: session.draft.date_of_birth || current.date_of_birth,
        gender: session.draft.gender || current.gender,
        city: session.draft.city || current.city,
      }));
      if (resumeStepFromSession.current && typeof session.step === 'number') {
        setStep(Math.min(Math.max(session.step, 0), STEPS.length - 1));
      }
      if (typeof session.submissionId === 'number') {
        setActiveSubmissionId(session.submissionId);
      }
    }
    setSessionHydrated(true);
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;
    const timer = window.setTimeout(() => {
      writeIdentityDraftSession({
        draft,
        step,
        submissionId: activeSubmissionId,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draft, step, activeSubmissionId, sessionHydrated]);

  const lockedStatuses = ['submitted', 'under_review', 'approved'];
  const isLocked =
    submitted ||
    initialCanSubmit === false ||
    (initialStatus && lockedStatuses.includes(initialStatus) && initialStatus !== 'needs_correction');
  if (isLocked) {
    const status = submitted ? 'submitted' : initialStatus;
    return (
      <div className="card p-6">
        <p className="text-sm text-text-muted">وضعیت پرونده: {identityStatusLabel(status ?? 'submitted')}</p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          {status === 'approved'
            ? 'هویت شما تأیید شده است.'
            : 'منتظر تأیید کارشناسان باشید. پس از تأیید، از طریق پیامک مطلع می‌شوید و پرونده فعلاً قابل ویرایش نیست.'}
        </p>
      </div>
    );
  }

  function clearStep1FieldError(field: IdentityStep1Field) {
    setStep1FieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handlePersianNameChange(field: 'first_name' | 'last_name', raw: string) {
    const sanitized = sanitizePersianNameInput(raw);
    const hadInvalid = raw !== sanitized;

    setDraft((d) => ({ ...d, [field]: sanitized }));
    setStep1FieldErrors((current) => {
      const next = { ...current };
      if (hadInvalid) {
        next[field] = PERSIAN_NAME_ONLY_ERROR;
      } else if (next[field] === PERSIAN_NAME_ONLY_ERROR) {
        delete next[field];
      }
      return next;
    });
  }

  function handlePersianCityChange(city: string) {
    setDraft((d) => ({ ...d, city }));
    setStep1FieldErrors((current) => {
      const next = { ...current };
      if (next.city === PERSIAN_CITY_ONLY_ERROR || next.city === IDENTITY_CLIENT_ERRORS.cityPersian) {
        delete next.city;
      }
      return next;
    });
  }

  function handlePersianCityRejectedInput() {
    setStep1FieldErrors((current) => ({ ...current, city: PERSIAN_CITY_ONLY_ERROR }));
  }

  function handleNationalCodeChange(raw: string) {
    const national_code = sanitizeLatinDigits(raw, 10);
    setDraft((d) => ({ ...d, national_code }));
    setStep1FieldErrors((current) => {
      const next = { ...current };
      if (getIranNationalCodeInputError(national_code) === 'invalid') {
        next.national_code = IDENTITY_CLIENT_ERRORS.nationalCodeInvalid;
      } else {
        delete next.national_code;
      }
      return next;
    });
  }

  function focusStep1Field(field: IdentityStep1Field) {
    window.requestAnimationFrame(() => {
      document.getElementById(field)?.focus();
    });
  }

  function applyDraftServerError(res: { error?: string; errorTitle?: string | null }) {
    if (!res.error) return;

    setErrorTitle(res.errorTitle ?? null);
    setError(res.error);

    if (res.errorTitle === IDENTITY_ERROR_TITLE_BY_CODE.invalid_national_code) {
      setStep1FieldErrors({ national_code: res.error });
      setStep(0);
      focusStep1Field('national_code');
      return;
    }

    if (res.errorTitle === IDENTITY_ERROR_TITLE_BY_CODE.duplicate_national_code) {
      setStep1FieldErrors({ national_code: res.error });
      setStep(0);
      focusStep1Field('national_code');
    }
  }

  async function persistIdentityDraft(): Promise<number | null> {
    const draftFd = new FormData();
    Object.entries(draft).forEach(([key, value]) => draftFd.set(key, value));
    const draftRes = await saveIdentityDraftAction({}, draftFd);
    if (draftRes.error) {
      applyDraftServerError(draftRes);
      return null;
    }

    const submissionId = draftRes.data?.draft_submission_id;
    if (typeof submissionId !== 'number') {
      setErrorTitle(IDENTITY_ERROR_TITLE_BY_CODE.server_error);
      setError(IDENTITY_CLIENT_ERRORS.step1Incomplete);
      return null;
    }

    setActiveSubmissionId(submissionId);
    setError(null);
    setErrorTitle(null);
    return submissionId;
  }

  async function uploadCardArtifact(
    submissionId: number,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    const reportProgress = onProgress ?? setCardUploadProgress;
    reportProgress(0);
    const optimizedCard = await optimizeNationalCardImage(file);
    const cardFd = new FormData();
    cardFd.set('type', 'national_card_front');
    cardFd.set('file', optimizedCard);
    cardFd.set('submission_id', String(submissionId));
    const { artifactId } = await uploadIdentityArtifactClient(cardFd, {
      onProgress: reportProgress,
    });
    setActiveCardArtifactId(artifactId);
    setCardReadyOnServer(true);
    setCardFile(null);
    if (!onProgress) setCardUploadProgress(null);
    else reportProgress(100);
  }

  function continueStep1() {
    setError(null);
    setErrorTitle(null);

    const fieldErrors = getIdentityStep1FieldErrors(draft);
    if (Object.keys(fieldErrors).length > 0) {
      setStep1FieldErrors(fieldErrors);
      const firstInvalid = IDENTITY_STEP1_FIELDS.find((field) => fieldErrors[field]);
      if (firstInvalid) focusStep1Field(firstInvalid);
      const clientError = validateIdentityStep1(draft);
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.step1);
      setError(clientError ?? IDENTITY_CLIENT_ERRORS.step1Incomplete);
      return;
    }

    setStep1FieldErrors({});
    setStep1Pending(true);
    void (async () => {
      try {
        const submissionId = await persistIdentityDraft();
        if (submissionId == null) return;
        setStep(1);
      } catch {
        setErrorTitle(IDENTITY_ERROR_TITLE_BY_CODE.server_error);
        setError(IDENTITY_CLIENT_ERRORS.step1Incomplete);
      } finally {
        setStep1Pending(false);
      }
    })();
  }

  function continueFromCard() {
    setError(null);
    setErrorTitle(null);

    if (!cardFile && !cardReadyOnServer) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.cardMissing);
      return;
    }

    if (cardReadyOnServer || !cardFile) {
      setStep(2);
      return;
    }

    setCardStepPending(true);
    void (async () => {
      try {
        let submissionId = activeSubmissionId;
        if (submissionId == null) {
          submissionId = await persistIdentityDraft();
          if (submissionId == null) return;
        }

        await uploadCardArtifact(submissionId, cardFile);
        setStep(2);
      } catch (err) {
        setCardUploadProgress(null);
        setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'بارگذاری تصویر کارت ملی ناموفق بود. دوباره تلاش کنید.',
        );
      } finally {
        setCardStepPending(false);
      }
    })();
  }

  function submitAll() {
    if (!cardReadyOnServer && !cardFile) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.cardMissing);
      return;
    }
    if (!videoBlob) {
      setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
      setError(IDENTITY_CLIENT_ERRORS.videoMissing);
      return;
    }

    setError(null);
    setErrorTitle(null);
    setPendingLabel('در حال آماده‌سازی پرونده…');
    startTransition(async () => {
      try {
        setUploadProgress(null);

        let submissionId = activeSubmissionId;
        if (submissionId == null) {
          setPendingLabel('در حال ذخیره اطلاعات…');
          submissionId = await persistIdentityDraft();
          if (submissionId == null) return;
        } else {
          setPendingLabel('در حال به‌روزرسانی اطلاعات…');
          submissionId = await persistIdentityDraft();
          if (submissionId == null) return;
        }

        if (cardFile) {
          setPendingLabel('در حال بارگذاری تصویر کارت…');
          try {
            await uploadCardArtifact(submissionId, cardFile, setUploadProgress);
          } catch (err) {
            setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
            setError(
              err instanceof Error && err.message
                ? err.message
                : 'بارگذاری تصویر کارت ملی ناموفق بود. دوباره تلاش کنید.',
            );
            return;
          }
        }

        setPendingLabel('در حال بهینه‌سازی ویدیو…');
        setUploadProgress(null);
        const optimizedVideo = await optimizeSelfieVideo(videoBlob);
        const videoToUpload = pickSmallerVideoBlob(videoBlob, optimizedVideo);
        if (videoToUpload.size > SELFIE_VIDEO_MAX_BYTES) {
          setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
          setError(IDENTITY_CLIENT_ERRORS.videoTooLarge);
          return;
        }

        setPendingLabel('در حال بارگذاری ویدیو…');
        setUploadProgress(0);
        const videoFd = new FormData();
        videoFd.set('type', 'selfie_video');
        videoFd.set('file', videoToUpload, selfieVideoFileName(videoToUpload));
        videoFd.set('submission_id', String(submissionId));
        await uploadIdentityArtifactClient(videoFd, { onProgress: setUploadProgress });

        setPendingLabel('در حال ثبت پرونده…');
        setUploadProgress(null);
        const submitFd = new FormData();
        Object.entries(draft).forEach(([key, value]) => submitFd.set(key, value));
        if (videoPrompt) submitFd.set('expected_video_text', videoPrompt);
        submitFd.set('draft_submission_id', String(submissionId));
        const res = await submitIdentityVerificationAction(submitFd);
        if (res.error) {
          setErrorTitle(res.errorTitle ?? null);
          setError(res.error);
          return;
        }
        setSubmitted(true);
        clearIdentityDraftSession();
        router.refresh();
      } catch (err) {
        setErrorTitle(IDENTITY_CLIENT_ERROR_TITLES.artifacts);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'ارسال پرونده تأیید هویت ناموفق بود. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.',
        );
      } finally {
        setUploadProgress(null);
        setPendingLabel('ارسال برای بررسی');
      }
    });
  }

  if (submitted) {
    return (
      <div className="card space-y-3 p-6">
        <p className="text-base font-semibold text-text">درخواست شما ثبت شد</p>
        <p className="text-sm leading-relaxed text-text">
          منتظر تأیید کارشناسان باشید. پس از بررسی و تأیید، از طریق پیامک و پنل مطلع می‌شوید.
        </p>
        <p className="text-sm text-text-muted">
          بعد از تأیید هویت می‌توانید از بخش «کانال مرجع» لینک عضویت ربات را دریافت کنید.
        </p>
      </div>
    );
  }

  const showSelfieHandoff = step === 2 && isPhone === false;
  const showSelfieRecorder = step === 2 && isPhone === true;
  const showSelfieLoading = step === 2 && isPhone === null;

  return (
    <div className="panel-identity-wizard flex flex-col gap-4 sm:gap-5">
      <ol className="panel-stepper-list panel-stepper-list--wizard">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className="panel-stepper-item panel-stepper-item--wizard"
            data-state={index < step ? 'done' : index === step ? 'active' : 'pending'}
          >
            <span className="panel-stepper-item__dot">
              {index < step ? <CheckCircle2 size={14} /> : index + 1}
            </span>
            <span className="panel-stepper-item__title panel-stepper-item__title--full">{label}</span>
            <span className="panel-stepper-item__title panel-stepper-item__title--short">{STEP_LABELS_SHORT[index]}</span>
          </li>
        ))}
      </ol>

      {correctionItems?.length ? (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-text">
          <p className="font-bold">موارد نیازمند اصلاح:</p>
          <ul className="mt-1 list-inside list-disc text-text-muted">
            {correctionItems.map((item) => (
              <li key={item}>{identityCorrectionLabel(item)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card panel-identity-wizard__card p-4 sm:p-6">
        {step === 0 ? (
          <div className="panel-form-grid">
            <div className="panel-form-grid__full panel-identity-step-intro">
              <div className="panel-identity-step-intro__header">
                <span className="panel-identity-step-intro__icon" aria-hidden>
                  <UserRound size={20} strokeWidth={2} />
                </span>
                <div className="panel-identity-step-intro__heading">
                  <h3 className="panel-identity-step-intro__title">اطلاعات هویتی</h3>
                  <div className="panel-identity-step-intro__warning">
                    <p className="panel-identity-step-intro__warning-text">
                      نام، نام خانوادگی و کد ملی باید متعلق به صاحب همین شماره تلفن باشد.
                    </p>
                    {accountMobile ? (
                      <span className="panel-identity-step-intro__account" dir="ltr">
                        {accountMobile}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="first_name">
                نام
              </label>
              <input
                id="first_name"
                className={cn('field-input', step1FieldErrors.first_name && 'field-input--error')}
                value={draft.first_name}
                onChange={(e) => handlePersianNameChange('first_name', e.target.value)}
                aria-invalid={Boolean(step1FieldErrors.first_name)}
                aria-describedby={step1FieldErrors.first_name ? 'first_name-error' : undefined}
                required
              />
              {step1FieldErrors.first_name ? (
                <p id="first_name-error" className="field-input-error" role="alert">
                  {step1FieldErrors.first_name}
                </p>
              ) : null}
            </div>
            <div>
              <label className="field-label" htmlFor="last_name">
                نام خانوادگی
              </label>
              <input
                id="last_name"
                className={cn('field-input', step1FieldErrors.last_name && 'field-input--error')}
                value={draft.last_name}
                onChange={(e) => handlePersianNameChange('last_name', e.target.value)}
                aria-invalid={Boolean(step1FieldErrors.last_name)}
                aria-describedby={step1FieldErrors.last_name ? 'last_name-error' : undefined}
                required
              />
              {step1FieldErrors.last_name ? (
                <p id="last_name-error" className="field-input-error" role="alert">
                  {step1FieldErrors.last_name}
                </p>
              ) : null}
            </div>
            <div>
              <label className="field-label" htmlFor="national_code">
                کد ملی
              </label>
              <input
                id="national_code"
                className={cn('field-input', step1FieldErrors.national_code && 'field-input--error')}
                dir="ltr"
                inputMode="numeric"
                maxLength={10}
                value={draft.national_code}
                onChange={(e) => handleNationalCodeChange(e.target.value)}
                onBlur={() => {
                  if (draft.national_code.length === 10 && getIranNationalCodeInputError(draft.national_code) === 'invalid') {
                    setStep1FieldErrors((current) => ({
                      ...current,
                      national_code: IDENTITY_CLIENT_ERRORS.nationalCodeInvalid,
                    }));
                  }
                }}
                aria-invalid={Boolean(step1FieldErrors.national_code)}
                aria-describedby={step1FieldErrors.national_code ? 'national_code-error' : undefined}
                required
              />
              {step1FieldErrors.national_code ? (
                <p id="national_code-error" className="field-input-error" role="alert">
                  {step1FieldErrors.national_code}
                </p>
              ) : null}
            </div>
            <div>
              <label className="field-label" htmlFor="date_of_birth" id="date_of_birth-label">
                تاریخ تولد
              </label>
              <JalaliWheelDateField
                id="date_of_birth"
                value={draft.date_of_birth}
                onChange={(date_of_birth) => {
                  clearStep1FieldError('date_of_birth');
                  setDraft((d) => ({ ...d, date_of_birth }));
                }}
                placeholder="۱۳۷۵/۰۳/۱۵"
                minDate={minBirthDate}
                maxDate={maxBirthDate}
                invalid={Boolean(step1FieldErrors.date_of_birth)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="gender" id="gender-label">
                جنسیت
              </label>
              <PanelOptionSheetField
                id="gender"
                title="جنسیت"
                placeholder="انتخاب کنید"
                value={draft.gender}
                onChange={(gender) => {
                  clearStep1FieldError('gender');
                  setDraft((d) => ({ ...d, gender }));
                }}
                options={[...IDENTITY_GENDER_OPTIONS]}
                layout="grid"
                required
                invalid={Boolean(step1FieldErrors.gender)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="city" id="city-label">
                شهر
              </label>
              <PanelCitySheetField
                id="city"
                title="شهر"
                placeholder="مثلاً تهران"
                value={draft.city}
                onChange={handlePersianCityChange}
                onRejectedInput={handlePersianCityRejectedInput}
                required
                invalid={Boolean(step1FieldErrors.city)}
                describedBy={step1FieldErrors.city ? 'city-error' : undefined}
              />
              {step1FieldErrors.city ? (
                <p id="city-error" className="field-input-error" role="alert">
                  {step1FieldErrors.city}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-primary panel-form-grid__full"
              disabled={step1Pending}
              onClick={continueStep1}
            >
              {step1Pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {step1Pending ? 'در حال ذخیره…' : 'ادامه'}
            </button>
          </div>
        ) : null}

        {step === 1 ? (
          <NationalCardUploadStep
            file={cardFile}
            serverCardArtifactId={cardReadyOnServer ? activeCardArtifactId : null}
            onFileChange={(file) => {
              setCardFile(file);
              if (file) setCardReadyOnServer(false);
            }}
            onBack={() => setStep(0)}
            onContinue={continueFromCard}
            continueDisabled={(!cardFile && !cardReadyOnServer) || cardStepPending}
            continuePending={cardStepPending}
            continuePendingLabel="در حال بارگذاری…"
            uploadProgress={cardUploadProgress}
          />
        ) : null}

        {showSelfieLoading ? (
          <p className="text-sm text-text-muted">در حال بررسی دستگاه…</p>
        ) : null}

        {showSelfieHandoff ? (
          <p className="text-sm text-text-muted">در حال آماده‌سازی ادامه با گوشی موبایل…</p>
        ) : null}

        {showSelfieRecorder ? (
          <LiveSelfieVideoStep
            hasRecording={!!videoBlob}
            onRecorded={(blob) => setVideoBlob(blob)}
            onPrompt={(text) => setVideoPrompt(text)}
            onBack={() => {
              setError(null);
              setStep(1);
            }}
            onContinue={() => {
              setError(null);
              setStep(3);
            }}
          />
        ) : null}

        {step === 3 ? (
          <IdentityReviewStep
            draft={draft}
            cardFile={cardFile}
            cardReadyOnServer={cardReadyOnServer}
            serverCardArtifactId={cardReadyOnServer ? activeCardArtifactId : null}
            videoBlob={videoBlob}
            pending={pending}
            pendingLabel={pendingLabel}
            uploadProgress={uploadProgress}
            onBack={() => setStep(2)}
            onSubmit={submitAll}
          />
        ) : null}

        {error ? (
          <IdentityVerificationFeedback error={error} errorTitle={errorTitle ?? undefined} />
        ) : null}
      </div>

      {showSelfieHandoff ? <SelfieMobileHandoff onBack={() => setStep(1)} /> : null}
    </div>
  );
}
