import type { Metadata } from 'next';
import { Headset, Heart, MessageSquare, Clock } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { NewTicketForm } from '@/components/student-panel/support/NewTicketForm';
import { QuickContactCards, TicketHistoryTable } from '@/components/student-panel/support/QuickContactCards';
import { FaqAccordion } from '@/components/FaqAccordion';
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
    <div className="panel-page-inner flex flex-col gap-6">
      <PanelPageHeader
        icon={Headset}
        title="پشتیبانی"
        description="ما اینجا هستیم تا در مسیر یادگیری، همیشه همراه و پاسخگو باشیم."
      />

      <QuickContactCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-text">
              <MessageSquare size={16} className="text-primary" />
              ایجاد تیکت جدید
            </h2>
            <NewTicketForm />
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-border/40 p-6 pb-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-text">
                <Clock size={16} className="text-primary" />
                تیکت‌های من
              </h2>
            </div>
            <TicketHistoryTable
              tickets={tickets}
              formatDate={formatDate}
              statusLabels={STATUS_LABELS}
              statusBadges={STATUS_BADGES}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-text">
              <Headset size={16} className="text-primary" />
              سوالات متداول
            </h2>
            <FaqAccordion items={FAQS} compact />
          </div>

          <div className="card relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 to-accent/5 p-6">
            <div className="relative z-10 mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Heart size={18} className="fill-current" />
              </div>
              <h3 className="text-xs font-bold text-text">خیالت راحت، ما همراهت هستیم</h3>
            </div>
            <p className="relative z-10 text-[11px] leading-relaxed text-text-muted">
              تیم پشتیبانی پنل آکادمی همه‌روزه آماده پاسخگویی به سوالات و رفع مشکلات شماست.
            </p>
            <span className="relative z-10 mt-4 inline-block text-xs font-bold text-primary">رضایت شما، اولویت ماست.</span>
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
