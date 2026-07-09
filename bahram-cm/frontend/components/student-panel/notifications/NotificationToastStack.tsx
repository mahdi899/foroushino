'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import type { PanelNotificationPayload } from '@/lib/student/panelActions';
import { NotificationToast } from './NotificationToast';

export function NotificationToastStack({
  toasts,
  onDismiss,
}: {
  toasts: PanelNotificationPayload[];
  onDismiss: (id: number) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || toasts.length === 0) return null;

  return createPortal(
    <div className="panel-notification-toast-overlay" aria-label="اعلان‌های جدید">
      <div className="panel-notification-toast-stack">
        {toasts.map((notification) => (
          <NotificationToast key={notification.id} notification={notification} onDismiss={onDismiss} />
        ))}
      </div>
    </div>,
    document.getElementById('panel-root') ?? document.body,
  );
}
