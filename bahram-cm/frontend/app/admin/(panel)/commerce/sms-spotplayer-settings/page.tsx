import { AdminPage } from '../../ui';
import { loadSmsSpotplayerSettingsAction } from '../actions';
import { SmsSpotplayerSettingsForm } from './SmsSpotplayerSettingsForm';

export const dynamic = 'force-dynamic';

export default async function SmsSpotplayerSettingsPage() {
  const data = await loadSmsSpotplayerSettingsAction();

  return (
    <AdminPage title="پیامک و SpotPlayer" desc="تنظیمات ارسال پیامک خرید و لایسنس دوره">
      <SmsSpotplayerSettingsForm initial={data} />
    </AdminPage>
  );
}
