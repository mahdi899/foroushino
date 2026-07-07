'use client';

import { Bell } from 'lucide-react';
import { markNotificationReadAction } from '@/lib/student/panelActions';

export interface NotificationEntry {
  id: number;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string | null;
}

export function NotificationItem({ notification }: { notification: NotificationEntry }) {
  return (
    <div
      className="flex items-start gap-3 border-b border-border p-4 last:border-0"
      onClick={() => {
        if (!notification.read_at) void markNotificationReadAction(notification.id);
      }}
    >
      <Bell size={18} className={notification.read_at ? 'text-text-muted' : 'text-primary'} />
      <div>
        <p className={`text-sm font-semibold ${notification.read_at ? 'text-text-muted' : 'text-text'}`}>
          {notification.title}
        </p>
        <p className="mt-1 text-xs text-text-muted">{notification.body}</p>
      </div>
    </div>
  );
}
