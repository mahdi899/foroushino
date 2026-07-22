import Link from 'next/link';
import { Headset } from 'lucide-react';
import { SpotPlayerDownloadGrid } from '@/components/student-panel/courses/SpotPlayerDownloadGrid';
import { TelegramSupportGroupsSection } from '@/components/student-panel/telegram/TelegramSupportGroupsSection';
import { panelStudentFetch } from '@/lib/student/panelServer';
import type { StudentTelegramDestinationsPayload } from '@/lib/student/telegramDestinations';

export async function CourseSideModules() {
  const telegramDestinations = await panelStudentFetch<{ data: StudentTelegramDestinationsPayload }>(
    '/telegram-destinations',
  ).catch(() => ({
    data: { telegram_linked: false, telegram_bot_url: null, destinations: [] },
  }));

  return (
    <div className="panel-side-modules">
      <TelegramSupportGroupsSection data={telegramDestinations.data} compact />

      <SpotPlayerDownloadGrid />

      <div className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Headset size={15} />
          </div>
          <h3 className="panel-card-title">مشکل در دسترسی؟</h3>
        </div>
        <p className="panel-card-text mb-3 leading-relaxed">
          اگر در ورود به اسپات‌پلیر یا مشاهده محتوا مشکلی دارید، تیم پشتیبانی آماده کمک است.
        </p>
        <Link href="/panel/support" className="btn btn-primary panel-text-body w-full">
          ثبت تیکت پشتیبانی
        </Link>
      </div>
    </div>
  );
}
