import { redirect } from 'next/navigation';

export default function SmsSpotplayerSettingsPage() {
  redirect('/admin/settings#sms-spotplayer-credentials');
}
