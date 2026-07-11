import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminPage, Badge } from '../../../ui';
import { getIdentityVerification } from '@/lib/admin/identityData';
import { IDENTITY_STATUS_LABELS } from '@/lib/admin/identityTypes';
import { formatDate } from '@/lib/admin/academyTypes';
import { can, getCurrentUser } from '@/lib/auth/session';
import { IdentityReviewActions } from '../IdentityReviewActions';

export const dynamic = 'force-dynamic';

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
      action={
        <Link href="/admin/academy/identity-verifications" className="btn btn-secondary">
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
                <Badge tone="accent">{IDENTITY_STATUS_LABELS[item.status] ?? item.status}</Badge>
                {item.submitted_at ? (
                  <span className="text-caption text-text-muted">ارسال: {formatDate(item.submitted_at)}</span>
                ) : null}
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 text-small">
                <div>
                  <dt className="text-text-muted">نام</dt>
                  <dd className="font-medium">
                    {item.first_name} {item.last_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">شهر</dt>
                  <dd className="font-medium">{item.city ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">تاریخ تولد</dt>
                  <dd className="font-medium" dir="ltr">
                    {item.date_of_birth ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">جنسیت</dt>
                  <dd className="font-medium">{item.gender ?? '—'}</dd>
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
                  {item.artifacts.map((art) => (
                    <li key={art.id} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-caption text-text-muted">
                        {art.type === 'national_card_front'
                          ? 'کارت ملی'
                          : art.type === 'selfie_video'
                            ? 'ویدیوی سلفی'
                            : art.type}
                      </p>
                      {art.mime_type?.startsWith('video/') || art.type === 'selfie_video' ? (
                        <video
                          controls
                          className="max-h-80 w-full rounded-lg bg-black"
                          src={art.stream_url ?? art.view_url ?? undefined}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={art.view_url ?? art.stream_url ?? ''}
                          alt={art.original_name ?? art.type}
                          className="max-h-80 rounded-lg object-contain"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="card p-5 text-small text-text-muted">
                {item.can_view_documents === false
                  ? 'اجازه مشاهده مدارک را ندارید.'
                  : 'مدرکی برای نمایش ثبت نشده است.'}
              </div>
            )}

            {item.reviews?.length ? (
              <div className="card p-5">
                <h2 className="mb-3 text-h3 text-primary-dark">تاریخچه بررسی</h2>
                <ul className="space-y-3">
                  {item.reviews.map((r) => (
                    <li key={r.id} className="border-b border-border pb-3 text-small last:border-0">
                      <p className="font-medium">{r.action}</p>
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
