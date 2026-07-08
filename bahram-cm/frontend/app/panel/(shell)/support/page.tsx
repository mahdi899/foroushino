import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Headset, Send, MessageCircle, Heart, ChevronLeft, MessageSquare, Clock, ShieldAlert
} from 'lucide-react';
import { NewTicketForm } from '@/components/student-panel/support/NewTicketForm';
import { FaqAccordion } from '@/components/FaqAccordion';
import { studentFetch } from '@/lib/student/session';

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
  {
    q: 'چگونه در دوره ثبت‌نام کنم؟',
    a: 'شما می‌توانید از طریق بخش دوره‌ها در سایت اصلی، دوره مورد نظر خود را انتخاب و ثبت‌نام کنید.',
  },
  {
    q: 'روش‌های پرداخت چگونه است؟',
    a: 'پرداخت به صورت آنلاین از طریق درگاه‌های معتبر بانکی و همچنین به صورت اقساطی امکان‌پذیر است.',
  },
  {
    q: 'چگونه به محتوای دوره دسترسی پیدا کنم؟',
    a: 'پس از ثبت‌نام، لایسنس اسپات‌پلیر در پنل کاربری شما فعال می‌شود و می‌توانید محتوا را مشاهده کنید.',
  },
  {
    q: 'چگونه گواهی پایان دوره دریافت کنم؟',
    a: 'پس از اتمام کامل دوره و ارسال پروژه‌ها، می‌توانید درخواست خود را برای صدور گواهی ارسال کنید.',
  },
  {
    q: 'حساب کاربری و ورود به پنل',
    a: 'با شماره موبایلی که ثبت‌نام کرده‌اید می‌توانید وارد پنل کاربری خود شوید.',
  },
];

export default async function PanelSupportPage() {
  const { data: tickets } = await studentFetch<{ data: TicketListItem[] }>('/tickets');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return '---';
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-glow">
            <Headset size={24} />
          </div>
          <h1 className="text-xl font-bold text-text">پشتیبانی</h1>
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          ما اینجا هستیم تا در مسیر یادگیری، همیشه همراه و پاسخگو باشیم.
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* WhatsApp Card */}
        <div className="card flex flex-col justify-between p-5 relative overflow-hidden group hover:border-green-500/30 transition-all">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                <MessageCircle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">واتساپ پشتیبانی</h3>
                <p className="mt-1 text-[10px] text-text-muted">پاسخگویی سریع در واتساپ</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded-lg">
              همه روزه ۹ تا ۲۱
            </span>
          </div>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-5 w-full text-xs py-2 border-green-500/20 text-green-500 hover:bg-green-500/5 hover:text-green-500 hover:border-green-500/40"
          >
            <MessageCircle size={14} />
            تماس از واتساپ
          </a>
          <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-green-500/5 blur-2xl group-hover:bg-green-500/10 transition-colors" />
        </div>

        {/* Telegram Card */}
        <div className="card flex flex-col justify-between p-5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Send size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">تلگرام پشتیبانی</h3>
                <p className="mt-1 text-[10px] text-text-muted">پشتیبانی از طریق تلگرام</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
              همه روزه ۹ تا ۲۱
            </span>
          </div>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-5 w-full text-xs py-2 border-blue-500/20 text-blue-500 hover:bg-blue-500/5 hover:text-blue-500 hover:border-blue-500/40"
          >
            <Send size={14} />
            تماس از تلگرام
          </a>
          <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Right Column (Larger) - Form and Ticket Table */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Create New Ticket */}
          <div className="card p-6">
            <h2 className="mb-5 text-sm font-bold text-text flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              ایجاد تیکت جدید
            </h2>
            <NewTicketForm />
          </div>

          {/* My Tickets */}
          <div className="card overflow-hidden">
            <div className="p-6 pb-4 border-b border-border/40">
              <h2 className="text-sm font-bold text-text flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                تیکت‌های من
              </h2>
            </div>

            {tickets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="panel-table">
                  <thead>
                    <tr>
                      <th>شناسه تیکت</th>
                      <th>موضوع</th>
                      <th>آخرین بروزرسانی</th>
                      <th>وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="group cursor-pointer">
                        <td className="font-semibold text-text-muted text-xs">
                          <Link href={`/panel/support/${ticket.id}`} className="block">
                            #TK-{ticket.id}
                          </Link>
                        </td>
                        <td className="font-bold text-text text-xs group-hover:text-primary transition-colors">
                          <Link href={`/panel/support/${ticket.id}`} className="block">
                            {ticket.subject}
                          </Link>
                        </td>
                        <td className="text-text-muted text-xs">
                          <Link href={`/panel/support/${ticket.id}`} className="block">
                            {formatDate(ticket.created_at)}
                          </Link>
                        </td>
                        <td>
                          <Link href={`/panel/support/${ticket.id}`} className="block">
                            <span className={`badge ${STATUS_BADGES[ticket.status] ?? 'badge-neutral'}`}>
                              {STATUS_LABELS[ticket.status] ?? ticket.status}
                            </span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <MessageSquare size={24} className="text-text-muted" />
                <p className="text-xs text-text-muted">هنوز تیکتی ثبت نکرده‌اید.</p>
              </div>
            )}
          </div>
        </div>

        {/* Left Column (Smaller) - FAQs and Trust Card */}
        <div className="flex flex-col gap-6">
          {/* FAQs Accordion */}
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-bold text-text flex items-center gap-2">
              <Headset size={16} className="text-primary" />
              سوالات متداول
            </h2>
            <FaqAccordion items={FAQS} compact={true} />
          </div>

          {/* Trust Card */}
          <div className="card p-6 bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20 relative overflow-hidden">
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Heart size={18} className="fill-current" />
              </div>
              <h3 className="text-xs font-bold text-text">خیالت راحت، ما همراهت هستیم</h3>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed mb-4 relative z-10">
              تیم پشتیبانی پنل آکادمی همه‌روزه آماده پاسخگویی به سوالات و رفع مشکلات شماست تا تجربه‌ای مطمئن و بدون دغدغه از یادگیری داشته باشید.
            </p>
            <span className="text-xs font-bold text-primary relative z-10">
              رضایت شما، اولویت ماست.
            </span>
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
