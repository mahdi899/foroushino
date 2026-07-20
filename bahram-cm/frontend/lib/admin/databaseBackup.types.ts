export type DatabaseBackupForm = {
  isAutoEnabled: boolean;
  scheduleTime: string;
  sendToTelegram: boolean;
  retentionCount: number;
};

export type DatabaseBackupView = {
  is_auto_enabled: boolean;
  schedule_time: string;
  send_to_telegram: boolean;
  retention_count: number;
  last_backup_at: string | null;
  last_backup_status: string | null;
  last_backup_message: string | null;
  last_backup_size_bytes: number | null;
  telegram_configured: boolean;
  telegram_chat_count: number;
  mysqldump_available: boolean;
  database_name: string;
  site_media_available: boolean;
};

export const DEFAULT_DATABASE_BACKUP_FORM: DatabaseBackupForm = {
  isAutoEnabled: false,
  scheduleTime: '04:00',
  sendToTelegram: true,
  retentionCount: 30,
};

export function databaseBackupViewToForm(view: DatabaseBackupView): DatabaseBackupForm {
  return {
    isAutoEnabled: view.is_auto_enabled,
    scheduleTime: view.schedule_time ?? '04:00',
    sendToTelegram: view.send_to_telegram,
    retentionCount: view.retention_count ?? 30,
  };
}

export function formatBackupSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
