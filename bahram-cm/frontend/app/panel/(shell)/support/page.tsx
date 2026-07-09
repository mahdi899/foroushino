import type { Metadata } from 'next';
import { Headset, Heart, HelpCircle, MessageSquare, Clock } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { NewTicketForm } from '@/components/student-panel/support/NewTicketForm';
import { PanelFaqAccordion } from '@/components/student-panel/support/PanelFaqAccordion';
import { QuickContactCards, TicketHistoryTable } from '@/components/student-panel/support/QuickContactCards';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'پشتیبانی | پنل کاربری', robots: { index: false, follow: false } };

interface TicketListItem {
  id: number;
  subject: string;
  status: string;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'باز',
  answered: 'پاسخ داده‌شده',
  waiting_user: 'در انتظار شما',
  closed: 'بسته‌شده',
};

const STATUS_BADGES: Record<string, string> = {
  open: 'badge-success',
  answered: 'badge-success',
  waiting_user: 'badge-warning',
  closed: 'badge-neutral',
};

const FAQS = [
  { q: 'چگونه در دوره ثبت‌نام کنم؟', a: 'از بخش دوره‌ها در سایت اصلی، دوره مورد نظر را انتخاب و ثبت‌نام کنید.' },
  { q: 'روش‌های پرداخت چگونه است؟', a: 'پرداخت آنلاین از طریق درگاه‌های معتبر بانکی و به صورت اقساطی امکان‌پذیر است.' },
  { q: 'چگونه به محتوای دوره دسترسی پیدا کنم؟', a: 'پس از ثبت‌نام، لایسنس اسپات‌پلیر در پنل کاربری فعال می‌شود.' },
  { q: 'چگونه گواهی پایان دوره دریافت کنم؟', a: 'پس از اتمام دوره و ارسال پروژه‌ها، درخواست صدور گواهی را ارسال کنید.' },
  { q: 'حساب کاربری و ورود به پنل', a: 'با شماره موبایلی که ثبت‌نام کرده‌اید وارد پنل شوید.' },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

export default async function PanelSupportPage() {
  const { data: tickets } = await panelStudentFetch<{ data: TicketListItem[] }>('/tickets');

  return (
    <div className="panel-page-inner panel-support-page flex flex-col gap-6">
      <PanelPageHeader
        icon={Headset}
        title="پشتیبانی"
        description="ما اینجا هستیم تا در مسیر یادگیری، همیشه همراه و پاسخگو باشیم."
        variant="support"
      />

      <QuickContactCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="panel-support-card card p-6">
            <header className="panel-support-card__header">
              <span className="panel-support-card__icon panel-support-card__icon--ticket">
                <MessageSquare size={18} strokeWidth={2} />
              </span>
              <div>
                <h2 className="panel-support-card__title">ایجاد تیکت جدید</h2>
                <p className="panel-support-card__desc">موضوع را کوتاه بنویسید تا سریع‌تر به دست تیم برسد.</p>
              </div>
            </header>
            <NewTicketForm />
          </section>

          <section className="panel-support-card card overflow-hidden">
            <header className="panel-support-card__header panel-support-card__header--soft">
              <span className="panel-support-card__icon panel-support-card__icon--history">
                <Clock size={18} strokeWidth={2} />
              </span>
              <div>
                <h2 className="panel-support-card__title">تیکت‌های من</h2>
                <p className="panel-support-card__desc">
                  {tickets.length > 0
                    ? `${tickets.length.toLocaleString('fa-IR')} تیکت ثبت‌شده`
                    : 'تاریخچه گفتگوهای پشتیبانی شما'}
                </p>
              </div>
            </header>
            <TicketHistoryTable
              tickets={tickets}
              formatDate={formatDate}
              statusLabels={STATUS_LABELS}
              statusBadges={STATUS_BADGES}
            />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="panel-support-card card p-6">
            <header className="panel-support-card__header panel-support-card__header--inline">
              <span className="panel-support-card__icon panel-support-card__icon--faq">
                <HelpCircle size={18} strokeWidth={2} />
              </span>
              <div>
                <h2 className="panel-support-card__title">سوالات متداول</h2>
                <p className="panel-support-card__desc">پاسخ سریع قبل از ثبت تیکت</p>
              </div>
            </header>
            <PanelFaqAccordion items={FAQS} />
          </section>

          <section className="panel-support-reassurance card relative overflow-hidden p-6">
            <div className="panel-support-reassurance__glow" aria-hidden />
            <div className="relative z-10 flex items-start gap-3">
              <span className="panel-support-reassurance__icon">
                <Heart size={20} className="fill-current" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="panel-support-reassurance__title">خیالت راحت، ما همراهت هستیم</h3>
                <p className="panel-support-reassurance__text">
                  تیم پشتیبانی پنل آکادمی همه‌روزه آماده پاسخگویی به سوالات و رفع مشکلات شماست.
                </p>
                <p className="panel-support-reassurance__tagline">رضایت شما، اولویت ماست.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
