import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Send } from 'lucide-react';
import { NewTicketForm } from '@/components/student-panel/support/NewTicketForm';
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

export default async function PanelSupportPage() {
  const { data: tickets } = await studentFetch<{ data: TicketListItem[] }>('/tickets');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-bold text-text">پشتیبانی</h1>

      <div className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle size={22} className="text-primary" />
          <p className="text-sm text-text">برای پاسخ سریع می‌توانید از تلگرام یا واتس‌اپ هم استفاده کنید.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://t.me/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs">
            <Send size={14} />
            تلگرام
          </a>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-base font-bold text-text">ثبت تیکت جدید</h2>
        <NewTicketForm />
      </div>

      {tickets.length > 0 ? (
        <div className="card divide-y divide-border">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/panel/support/${ticket.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-surface-soft"
            >
              <span className="text-sm text-text">{ticket.subject}</span>
              <span className="badge badge-neutral">{STATUS_LABELS[ticket.status] ?? ticket.status}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
