import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, LifeBuoy, Receipt, User as UserIcon } from 'lucide-react';
import { Badge, EditLink, Table } from '../../ui';
import {
  SAT_STATUS_LABELS,
  STUDENT_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  formatDateTime,
  formatToman,
  type AdminStudentDetail,
} from '@/lib/admin/academyTypes';
import { COURSE_ACCESS_SOURCE_LABELS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/admin/commerceTypes';
import { StudentStatusForm } from './StudentStatusForm';

function statusTone(status: AdminStudentDetail['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'danger' as const;
}

function orderTone(status: string) {
  if (status === 'paid' || status === 'fulfilled') return 'success' as const;
  if (status === 'pending_payment') return 'warning' as const;
  if (status === 'failed' || status === 'cancelled') return 'danger' as const;
  return 'default' as const;
}

function ticketTone(status: string) {
  if (status === 'open') return 'warning' as const;
  if (status === 'closed') return 'default' as const;
  return 'success' as const;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-caption text-text-muted">{label}</p>
        <p className="text-h3 font-bold text-primary-dark">{value.toLocaleString('fa-IR')}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir }: { label: string; value: React.ReactNode; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="min-w-0 border-b border-border/60 py-2.5 last:border-0 sm:flex sm:gap-4">
      <dt className="shrink-0 text-caption text-text-muted sm:w-36">{label}</dt>
      <dd className={`mt-0.5 min-w-0 text-small text-text sm:mt-0 ${dir === 'ltr' ? 'font-mono' : ''}`} dir={dir}>
        {value ?? '—'}
      </dd>
    </div>
  );
}

function OrderMobileCard({
  order,
}: {
  order: AdminStudentDetail['orders'][number];
}) {
  return (
    <Link
      href={`/admin/commerce/orders/${order.id}`}
      className="card block p-4 transition hover:border-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-primary-dark">{order.product_title ?? 'محصول'}</p>
          <p className="mt-1 font-mono text-caption text-text-muted" dir="ltr">
            {order.order_number}
          </p>
        </div>
        <Badge tone={orderTone(order.status)}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-caption">
        <div>
          <dt className="text-text-muted">مبلغ</dt>
          <dd className="mt-0.5 font-medium">{formatToman(order.final_amount)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">پرداخت</dt>
          <dd className="mt-0.5">{PAYMENT_STATUS_LABELS[order.payment_status ?? ''] ?? order.payment_status ?? '—'}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-text-muted">تاریخ</dt>
          <dd className="mt-0.5">{formatDateTime(order.created_at)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function TicketMobileCard({ ticket }: { ticket: AdminStudentDetail['tickets'][number] }) {
  return (
    <Link
      href={`/admin/academy/tickets/${ticket.id}`}
      className="card block p-4 transition hover:border-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium text-primary-dark">{ticket.subject}</p>
        <Badge tone={ticketTone(ticket.status)}>{TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
      </div>
      <p className="mt-2 text-caption text-text-muted">
        {ticket.department ?? 'عمومی'} · {formatDateTime(ticket.updated_at ?? ticket.created_at)}
      </p>
    </Link>
  );
}

export function StudentDetailView({ student }: { student: AdminStudentDetail }) {
  const profile = student.profile;
  const avatarUrl = profile?.avatar_url;
  const accountEmail = student.email ?? profile?.email;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="card overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative mx-auto h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-soft sm:mx-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={student.display_name} fill className="object-cover" sizes="80px" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <UserIcon size={32} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-right">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-h2 font-bold text-primary-dark">{student.display_name}</h2>
              <Badge tone={statusTone(student.status)}>{STUDENT_STATUS_LABELS[student.status]}</Badge>
            </div>
            {profile?.first_name || profile?.last_name ? (
              <p className="mt-1 text-caption text-text-muted">نام حساب: {student.name}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-small text-text-muted sm:justify-start">
              {student.mobile ? (
                <span dir="ltr">{student.mobile}</span>
              ) : null}
              {accountEmail ? <span>{accountEmail}</span> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="کل سفارش‌ها" value={student.stats.orders_total} icon={Receipt} />
        <StatCard label="پرداخت‌شده" value={student.stats.orders_paid} icon={Receipt} />
        <StatCard label="دوره‌ها" value={student.stats.course_accesses} icon={BookOpen} />
        <StatCard label="تیکت‌ها" value={student.stats.tickets} icon={LifeBuoy} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Profile */}
        <div className="card p-4 sm:p-6">
          <h3 className="mb-3 text-h3 font-bold text-primary-dark">پروفایل دانشجو</h3>
          {profile ? (
            <dl>
              <InfoRow label="نام" value={profile.first_name} />
              <InfoRow label="نام خانوادگی" value={profile.last_name} />
              <InfoRow label="ایمیل پروفایل" value={profile.email} />
              <InfoRow label="شهر" value={profile.city} />
              <InfoRow label="سن" value={profile.age?.toLocaleString('fa-IR')} />
              <InfoRow label="شغل فعلی" value={profile.current_job} />
              <InfoRow label="سطح تجربه" value={profile.experience_level} />
              <InfoRow label="هدف درآمدی" value={profile.income_goal} />
              <InfoRow label="اینستاگرام" value={profile.instagram} dir="ltr" />
              <InfoRow label="تلگرام" value={profile.telegram} dir="ltr" />
              <InfoRow label="آخرین به‌روزرسانی" value={formatDateTime(profile.updated_at)} />
            </dl>
          ) : (
            <p className="text-small text-text-muted">پروفایل تکمیل نشده است.</p>
          )}
        </div>

        {/* Account */}
        <div className="card p-4 sm:p-6">
          <h3 className="mb-3 text-h3 font-bold text-primary-dark">اطلاعات حساب</h3>
          <dl>
            <InfoRow label="موبایل" value={student.mobile} dir="ltr" />
            <InfoRow label="ایمیل حساب" value={student.email} />
            <InfoRow
              label="تأیید موبایل"
              value={student.mobile_verified_at ? formatDateTime(student.mobile_verified_at) : 'تأیید نشده'}
            />
            <InfoRow label="اولین ورود" value={formatDateTime(student.first_login_at)} />
            <InfoRow label="آخرین ورود" value={formatDateTime(student.last_login_at)} />
            <InfoRow label="تاریخ ثبت‌نام" value={formatDateTime(student.created_at)} />
          </dl>
          <div className="mt-5 border-t border-border pt-4">
            <StudentStatusForm studentId={student.id} initialStatus={student.status} />
          </div>
        </div>
      </div>

      {/* Orders */}
      <div className="card p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-h3 font-bold text-primary-dark">سفارش‌ها</h3>
          <span className="text-caption text-text-muted">
            {student.stats.orders_paid} پرداخت‌شده · {student.stats.orders_unpaid} پرداخت‌نشده
          </span>
        </div>
        {student.orders.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table head={['شماره', 'محصول', 'مبلغ', 'وضعیت سفارش', 'پرداخت', 'تاریخ', '']}>
                {student.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-soft/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-caption" dir="ltr">
                      {o.order_number}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3">{o.product_title ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatToman(o.final_amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={orderTone(o.status)}>{ORDER_STATUS_LABELS[o.status] ?? o.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-caption">
                      {PAYMENT_STATUS_LABELS[o.payment_status ?? ''] ?? o.payment_status ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-caption">{formatDateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <EditLink href={`/admin/commerce/orders/${o.id}`} />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="flex flex-col gap-3 md:hidden">
              {student.orders.map((o) => (
                <OrderMobileCard key={o.id} order={o} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-small text-text-muted">سفارشی ثبت نشده است.</p>
        )}
      </div>

      {/* Course accesses */}
      <div className="card p-4 sm:p-6">
        <h3 className="mb-4 text-h3 font-bold text-primary-dark">دسترسی به دوره‌ها</h3>
        {student.course_accesses.length > 0 ? (
          <ul className="divide-y divide-border">
            {student.course_accesses.map((ca) => (
              <li key={ca.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-text">{ca.product_title ?? '—'}</p>
                  <p className="mt-1 text-caption text-text-muted">
                    {COURSE_ACCESS_SOURCE_LABELS[ca.source ?? ''] ?? ca.source ?? '—'}
                    {ca.activated_at ? ` · ${formatDateTime(ca.activated_at)}` : ''}
                  </p>
                </div>
                <Badge tone={ca.status === 'active' ? 'success' : 'default'}>{ca.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-text-muted">دسترسی فعالی ثبت نشده است.</p>
        )}
      </div>

      {/* Tickets */}
      <div className="card p-4 sm:p-6">
        <h3 className="mb-4 text-h3 font-bold text-primary-dark">تیکت‌های پشتیبانی</h3>
        {student.tickets.length > 0 ? (
          <>
            <div className="hidden md:block">
              <Table head={['موضوع', 'بخش', 'وضعیت', 'آخرین به‌روزرسانی', '']}>
                {student.tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-soft/40">
                    <td className="max-w-xs truncate px-4 py-3">{t.subject}</td>
                    <td className="px-4 py-3 text-caption">{t.department ?? 'عمومی'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ticketTone(t.status)}>{TICKET_STATUS_LABELS[t.status] ?? t.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-caption">
                      {formatDateTime(t.updated_at ?? t.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <EditLink href={`/admin/academy/tickets/${t.id}`} />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="flex flex-col gap-3 md:hidden">
              {student.tickets.map((t) => (
                <TicketMobileCard key={t.id} ticket={t} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-small text-text-muted">تیکتی ثبت نشده است.</p>
        )}
      </div>

      {/* SAT */}
      {student.sat_applications.length > 0 && (
        <div className="card p-4 sm:p-6">
          <h3 className="mb-4 text-h3 font-bold text-primary-dark">درخواست سات</h3>
          <ul className="divide-y divide-border">
            {student.sat_applications.map((sa) => (
              <li key={sa.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-small">درخواست #{sa.id}</span>
                <div className="flex items-center gap-3">
                  <span className="text-caption text-text-muted">{formatDateTime(sa.created_at)}</span>
                  <Badge>{SAT_STATUS_LABELS[sa.status] ?? sa.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
