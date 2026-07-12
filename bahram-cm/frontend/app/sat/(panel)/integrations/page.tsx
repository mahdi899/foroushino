import { redirect } from 'next/navigation';
import { getCurrentSatUser, satFetch } from '@/lib/sat/session';
import { SatIntegrationsClient } from './SatIntegrationsClient';

export default async function SatIntegrationsPage() {
  const user = await getCurrentSatUser();
  if (!user?.is_super_admin) redirect('/sat');

  const res = await satFetch<{
    data: {
      tokens: Array<{
        id: number;
        name: string;
        abilities: string[];
        created_by_name: string | null;
        last_used_at: string | null;
        revoked_at: string | null;
        created_at: string | null;
      }>;
      inbound_applications_url: string;
      inbound_ping_url: string;
    };
  }>('/sat/integration-tokens');

  return (
    <div>
      <h2 className="text-xl font-semibold">اتصال API با سایت بهرام</h2>
      <p className="mt-2 text-sm text-bone/70">تنها راه ارتباط سات با بهرام — یک‌طرفه و فقط هنگام پذیرش درخواست.</p>
      <div className="mt-6">
        <SatIntegrationsClient
          tokens={res.data.tokens}
          inboundApplicationsUrl={res.data.inbound_applications_url}
          inboundPingUrl={res.data.inbound_ping_url}
        />
      </div>
    </div>
  );
}
