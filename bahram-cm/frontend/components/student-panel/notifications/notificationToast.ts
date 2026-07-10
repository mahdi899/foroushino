import type { PanelNotificationPayload } from '@/lib/student/panelActions';

/** Only admin-composed broadcasts should surface as panel popups. */
export function shouldShowNotificationToast(notification: PanelNotificationPayload): boolean {
  return notification.show_toast === true;
}
