import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, ShieldCheck, ExternalLink } from 'lucide-react';
import { PanelPageHeader } from '@/components/student-panel/layout/PanelPageHeader';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'کانال مرجع | پنل کاربری', robots: { index: false, follow: false } };

interface ReferenceChannelListItem {
  id: number;
  slug: string;
  title: string;
  product_slug: string | null;
  identity_ready: boolean;
  verification_level: number;
  bot_start_url: string | null;
  source: string | null;
}

export default async function PanelReferenceChannelsPage() {
  const { data: channels } = await panelStudentFetch<{ data: ReferenceChannelListItem[] }>('/reference-channels');

  return (
    <div className="panel-page-inner flex flex-col gap-5">
      <PanelPageHeader
        icon={Radio}
        title="کانال مرجع"
        description="دسترسی به گروه مرجع پس از احراز هویت و استارت ربات تلگرام"
      />

      {channels.length === 0 ? (
        <div className="panel-empty-state card flex flex-col items-center gap-3 p-10 text-center">
          <Radio size={32} className="text-text-muted" />
          <p className="text-sm text-text-muted">هنوز کانال مرجعی برای شما ثبت نشده است.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {channels.map((channel) => (
            <article key={channel.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-text">{channel.title}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  {channel.identity_ready
                    ? 'هویت شما تأیید شده است. برای عضویت در گروه مرجع، ربات را با لینک سریع استارت کنید.'
                    : 'پس از خرید، ابتدا احراز هویت را کامل کنید؛ پس از تأیید کارشناس، لینک عضویت ربات فعال می‌شود.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!channel.identity_ready ? (
                  <Link href="/panel/identity-verification" className="btn btn-primary">
                    <ShieldCheck size={16} />
                    احراز هویت
                  </Link>
                ) : channel.bot_start_url ? (
                  <a href={channel.bot_start_url} target="_blank" rel="noreferrer" className="btn btn-primary">
                    <ExternalLink size={16} />
                    عضویت از طریق ربات
                  </a>
                ) : null}
                <Link href={`/panel/reference-channel/${channel.id}`} className="btn btn-ghost">
                  جزئیات
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
