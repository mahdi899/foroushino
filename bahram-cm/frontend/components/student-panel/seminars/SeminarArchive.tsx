import Link from 'next/link';
import { ChevronLeft, MapPin, PlayCircle, Video } from 'lucide-react';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';

export interface SeminarListItem {
  id: number;
  slug: string;
  title: string;
  date: string | null;
  location: string | null;
  attendance_status: string | null;
}

export function SeminarFeaturedBanner({ seminar }: { seminar: SeminarListItem }) {
  return (
    <Link
      href={`/panel/seminars/${seminar.id}`}
      className="card group relative overflow-hidden p-5 transition-all duration-300 hover:scale-[1.01] hover:border-primary/40"
    >
      <div className="absolute inset-0 bg-gradient-to-l from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PlayCircle size={32} />
          </div>
          <div>
            <StatusBadge variant="teal">سمینار فعال</StatusBadge>
            <h2 className="mt-2 text-base font-bold text-text">{seminar.title}</h2>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
              {seminar.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} />
                  {seminar.location}
                </span>
              ) : null}
              {seminar.date ? <span>{new Date(seminar.date).toLocaleDateString('fa-IR')}</span> : null}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          مشاهده جزئیات
          <ChevronLeft className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export function SeminarVideoList({ seminars }: { seminars: SeminarListItem[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-text">
          <Video size={16} className="text-primary" />
          آرشیو ویدیوهای سمینار
        </h3>
      </div>
      <ul className="divide-y divide-border">
        {seminars.map((seminar) => (
          <li key={seminar.id}>
            <Link
              href={`/panel/seminars/${seminar.id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-soft"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
                <PlayCircle size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{seminar.title}</p>
                {seminar.date ? (
                  <p className="mt-0.5 text-xs text-text-subtle">{new Date(seminar.date).toLocaleDateString('fa-IR')}</p>
                ) : null}
              </div>
              <ChevronLeft size={16} className="shrink-0 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
