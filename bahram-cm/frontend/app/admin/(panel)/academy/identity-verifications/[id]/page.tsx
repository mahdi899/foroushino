import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPage, Badge } from '../../../ui';
import { getIdentityVerification } from '@/lib/admin/identityData';
import { IDENTITY_GENDER_LABELS, IDENTITY_STATUS_LABELS } from '@/lib/admin/identityTypes';
import { formatDate } from '@/lib/admin/academyTypes';
import { can, getCurrentUser } from '@/lib/auth/session';
import { formatDateFa } from '@/lib/persian';
import { IdentityDocumentViewer } from '../IdentityDocumentViewer';
import { IdentityReviewActions } from '../IdentityReviewActions';

export const dynamic = 'force-dynamic';

function statusTone(status: string): 'default' | 'success' | 'warning' | 'accent' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  if (status === 'needs_correction') return 'warning';
  if (status === 'submitted' || status === 'under_review') return 'accent';
  return 'default';
}

function formatBirthDateFa(value: string | null | undefined): string {
  if (!value) return '—';
  return formatDateFa(value);
}

function formatGenderFa(value: string | null | undefined): string {
  if (!value) return '—';
  return IDENTITY_GENDER_LABELS[value] ?? value;
}

export default async function IdentityVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) notFound();

  const user = await getCurrentUser();
  const { item, error } = await getIdentityVerification(numericId);
  if (!item && !error) notFound();

  return (
    <AdminPage
      icon="ShieldCheck"
      title={item ? `بررسی پرونده #${item.id}` : 'بررسی پرونده'}
      desc={item ? `${item.first_name} ${item.last_name}` : undefined}
      backHref="/admin/academy/identity-verifications"
      backLabel="بازگشت به صف"
      action={
        <Link href="/admin/academy/identity-verifications" className="btn btn-secondary hidden lg:inline-flex">
          بازگشت به صف
        </Link>
      }
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      ) : null}

      {item ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="card p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(item.status)}>{IDENTITY_STATUS_LABELS[item.status] ?? item.status}</Badge>
                {item.submitted_at ? (
                  <span className="text-caption text-text-muted">ارسال: {formatDate(item.submitted_at)}</span>
                ) : null}
                {item.reviewed_at ? (
                  <span className="text-caption text-text-muted">بررسی: {formatDate(item.reviewed_at)}</span>
                ) : null}
              </div>

              {item.mobile_match?.match_status === 'mismatched' ? (
                <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
                  <p className="mb-1 font-bold">رد خودکار: موبایل با کد ملی مطابقت ندارد</p>
                  <p>
                    {item.mobile_match.message ??
                      'استعلام شاهکار نشان داد شماره موبایل حساب متعلق به این کد ملی نیست.'}
                  </p>
                </div>
              ) : item.mobile_match?.match_status === 'unavailable' ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-small text-warning-dark">
                  <p className="mb-1 font-bold">استعلام تطبیق موبایل و کد ملی انجام نشد</p>
                  <p>
                    {item.mobile_match.message ??
                      'سرویس شاهکار در دسترس نبود. لطفاً هنگام بررسی دستی به این مورد توجه کنید.'}
                  </p>
                </div>
              ) : item.mobile_match?.match_status === 'matched' ? (
                <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-small text-success">
                  تطبیق موبایل و کد ملی (شاهکار) موفق بود.
                </div>
              ) : null}

              {item.registry?.match_status === 'mismatched' && item.registry.first_name && item.registry.last_name ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-small text-warning-dark">
                  <p className="mb-2 font-bold">اطلاعات شخصی خطا داریم — اختلاف نام</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-caption text-text-muted">وارد‌شده توسط کاربر</p>
                      <p className="font-medium text-text">
                        {item.first_name} {item.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-text-muted">استعلام (PersonInfo)</p>
                      <p className="font-medium text-text">
                        {item.registry.first_name} {item.registry.last_name}
                      </p>
                      {item.registry.father_name ? (
                        <p className="mt-1 text-caption text-text-muted">
                          نام پدر: <span className="font-medium text-text">{item.registry.father_name}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-caption text-text-muted">
                    در صورت تأیید، نام، نام‌خانوادگی و نام پدر استعلام رسمی در پروفایل ثبت می‌شود.
                  </p>
                </div>
              ) : item.registry?.match_status === 'mismatched' ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-small text-warning-dark">
                  <p className="mb-1 font-bold">اطلاعات شخصی خطا داریم</p>
                  <p>
                    {item.registry.message ??
                      'کد ملی با تاریخ تولد واردشده در استعلام رسمی یافت نشد. کاربر ارسال کرده؛ لطفاً هنگام بررسی دستی تاریخ تولد و مشخصات را با مدارک تطبیق دهید.'}
                  </p>
                </div>
              ) : item.registry?.match_status === 'matched' ? (
                <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-small text-success">
                  نام کاربر با استعلام مشخصات هویتی مطابقت داشت — پرونده در صف بررسی کارشناس است.
                </div>
              ) : item.registry?.match_status === 'unavailable' ? (
                <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-small text-warning-dark">
                  <p className="mb-1 font-bold">اطلاعات شخصی خطا داریم</p>
                  <p>
                    {item.registry.message ??
                      'استعلام مشخصات هویتی (PersonInfo) در دسترس نبود یا پاسخ ناقص بود — بررسی دستی لازم است.'}
                  </p>
                </div>
              ) : item.registry?.message && !item.registry.match_status ? (
                <div className="mb-4 rounded-lg border border-border bg-surface-soft px-4 py-3 text-small text-text-muted">
                  <p className="mb-1 font-bold text-text">استعلام مشخصات هویتی رد شد</p>
                  <p>{item.registry.message}</p>
                </div>
              ) : null}
              <dl className="grid gap-3 sm:grid-cols-2 text-small">
                <div>
                  <dt className="text-text-muted">نام</dt>
                  <dd className="font-medium">
                    {item.first_name} {item.last_name}
                  </dd>
                </div>
                {item.registry?.father_name ? (
                  <div>
                    <dt className="text-text-muted">نام پدر (استعلام)</dt>
                    <dd className="font-medium">{item.registry.father_name}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-text-muted">شهر</dt>
                  <dd className="font-medium">{item.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">تاریخ تولد</dt>
                  <dd className="font-medium">{formatBirthDateFa(item.date_of_birth)}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">جنسیت</dt>
                  <dd className="font-medium">{formatGenderFa(item.gender)}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">موبایل</dt>
                  <dd className="font-medium" dir="ltr">
                    {item.user_mobile_masked ?? '—'}
                  </dd>
                </div>
                {item.expected_video_text ? (
                  <div className="sm:col-span-2">
                    <dt className="text-text-muted">متن مورد انتظار ویدیو</dt>
                    <dd className="mt-1 rounded-lg bg-surface-soft px-3 py-2 font-medium">{item.expected_video_text}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            {item.can_view_documents !== false && item.artifacts?.length ? (
              <div className="card p-5">
                <h2 className="mb-3 text-h3 text-primary-dark">مدارک</h2>
                <ul className="space-y-4">
                  {item.artifacts.map((art) => {
                    const mediaUrl = art.stream_url ?? art.view_url ?? null;
                    const isVideo =
                      art.mime_type?.startsWith('video/') || art.type === 'selfie_video';
                    const label =
                      art.type === 'national_card_front'
                        ? 'کارت ملی'
                        : art.type === 'selfie_video'
                          ? 'ویدیوی سلفی'
                          : art.type;

                    return (
                    <li key={art.id} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-caption text-text-muted">{label}</p>
                      {mediaUrl ? (
                        <IdentityDocumentViewer
                          src={mediaUrl}
                          label={label}
                          isVideo={isVideo}
                          mimeType={art.mime_type}
                        />
                      ) : (
                        <p className="text-small text-text-muted">فایل مدرک در دسترس نیست.</p>
                      )}
                    </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="card p-5 text-small text-text-muted">
                {item.can_view_documents === false
                  ? 'اجازه مشاهده مدارک را ندارید.'
                  : item.artifacts_purged || item.status === 'approved'
                    ? 'مدارک حساس (تصویر کارت ملی و ویدیوی سلفی) پس از تأیید از سرور حذف شده‌اند. اطلاعات هویتی و تاریخچه بررسی همچنان قابل مشاهده است.'
                    : 'مدرکی برای نمایش ثبت نشده است.'}
              </div>
            )}

            {item.reviews?.length ? (
              <div className="card p-5">
                <h2 className="mb-3 text-h3 text-primary-dark">تاریخچه بررسی</h2>
                <ul className="space-y-3">
                  {item.reviews.map((r) => (
                    <li key={r.id} className="border-b border-border pb-3 text-small last:border-0">
                      <p className="font-medium">
                        {r.action === 'approve'
                          ? 'تأیید'
                          : r.action === 'reject'
                            ? 'رد'
                            : r.action === 'request_correction'
                              ? 'درخواست اصلاح'
                              : r.action}
                      </p>
                      {r.reviewer_note ? <p className="text-text-muted">{r.reviewer_note}</p> : null}
                      <p className="text-caption text-text-muted">
                        {r.reviewer_name ?? '—'} · {formatDate(r.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <IdentityReviewActions
              detail={item}
              canApprove={can(user, 'identity.approve')}
              canReject={can(user, 'identity.reject')}
              canCorrection={can(user, 'identity.request_correction')}
              canUnlock={can(user, 'identity.unlock_ownership_verification')}
            />
            <Link
              href="/admin/academy/identity-verifications?status=submitted"
              className="btn btn-secondary w-full justify-center"
            >
              پرونده بعدی در صف
            </Link>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
