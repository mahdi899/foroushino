import { getCurrentSatUser, satCan } from '@/lib/sat/session';

export default async function SatDashboardPage() {
  const user = await getCurrentSatUser();

  const cards = [
    {
      title: 'سرنخ‌ها',
      desc: 'مدیریت لیدها و تخصیص تماس',
      show:
        satCan(user, 'sat.leads.view_own') ||
        satCan(user, 'sat.leads.view_team') ||
        satCan(user, 'sat.leads.view_all'),
    },
    {
      title: 'تماس‌ها',
      desc: 'ثبت و بررسی تماس‌های تیم',
      show:
        satCan(user, 'sat.calls.view_own') ||
        satCan(user, 'sat.calls.view_team') ||
        satCan(user, 'sat.calls.view_all'),
    },
    {
      title: 'فعالیت‌ها',
      desc: 'پیگیری و تأیید فعالیت کارشناسان',
      show:
        satCan(user, 'sat.activities.view_own') ||
        satCan(user, 'sat.activities.view_team') ||
        satCan(user, 'sat.activities.view_all'),
    },
    {
      title: 'پرسنل',
      desc: 'افزودن کارشناس و لیدر',
      show: satCan(user, 'sat.staff.view'),
    },
    {
      title: 'مالی',
      desc: 'واریزی‌ها و برداشت‌ها',
      show: satCan(user, 'sat.deposits.view') || satCan(user, 'sat.withdrawals.view'),
    },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">سلام، {user?.name}</h2>
        <p className="mt-2 text-bone/70">
          نقش شما: <span className="text-gold">{user?.role_label}</span> — ورود فقط برای پرسنل از پیش تعریف‌شده است.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <article key={card.title} className="rounded-xl border border-gold/15 bg-white/5 p-4">
            <h3 className="font-medium text-gold">{card.title}</h3>
            <p className="mt-2 text-sm text-bone/70">{card.desc}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
