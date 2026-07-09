import { AdminPage } from '../../ui';
import { getAudienceSegments, getSmsLogs } from '@/lib/admin/academyData';
import { loadSmsCenterConfig } from '@/lib/admin/smsCenter';
import { SmsCenterClient } from './SmsCenterClient';

export const dynamic = 'force-dynamic';

export default async function SmsCenterPage() {
  const [{ items: segments }, { items: logs, error }, config] = await Promise.all([
    getAudienceSegments(),
    getSmsLogs(),
    loadSmsCenterConfig(),
  ]);

  return (
    <AdminPage
      title="مرکز پیامک"
      desc="رویدادهای خودکار، ارسال هدفمند و پیگیری لاگ پیامک"
      icon="Smartphone"
    >
      <SmsCenterClient segments={segments} logs={logs} logsError={error ?? undefined} config={config} />
    </AdminPage>
  );
}
