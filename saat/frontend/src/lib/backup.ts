import { getToken } from './auth'
import { API_BASE_URL, http } from './http'

export type BackupView = {
  is_auto_enabled: boolean
  schedule_time: string
  retention_count: number
  last_backup_at: string | null
  last_backup_status: string | null
  last_backup_message: string | null
  last_backup_size_bytes: number | null
  mysqldump_available: boolean
  database_name: string
  storage_app_exists: boolean
}

export type BackupForm = {
  isAutoEnabled: boolean
  scheduleTime: string
  retentionCount: number
}

export function backupViewToForm(view: BackupView): BackupForm {
  return {
    isAutoEnabled: view.is_auto_enabled,
    scheduleTime: view.schedule_time,
    retentionCount: view.retention_count,
  }
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function fetchBackupSettings(): Promise<BackupView> {
  return http.get<BackupView>('/admin/backup')
}

export async function updateBackupSettings(input: {
  is_auto_enabled?: boolean
  schedule_time?: string
  retention_count?: number
}): Promise<BackupView> {
  return http.patch<BackupView>('/admin/backup', input)
}

export async function runBackupNow(): Promise<{ ok: boolean; message: string }> {
  const data = await http.post<{ ok: boolean; message: string }>('/admin/backup/run')
  return { ok: data.ok, message: data.message }
}

async function downloadBackupFile(path: string, fallbackName: string): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Accept: 'application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    return { ok: false, error: 'دانلود فایل بکاپ ناموفق بود.' }
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'دانلود فایل بکاپ ناموفق بود.'
    return { ok: false, error: message }
  }

  const disposition = response.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="?([^";]+)"?/i)
  const filename = match?.[1] ?? fallbackName
  const blob = await response.blob()

  return { ok: true, blob, filename }
}

export async function exportDatabaseBackup(): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  return downloadBackupFile('/admin/backup/export/database', `saat-db-${new Date().toISOString().slice(0, 10)}.sql.gz`)
}

export async function exportStorageBackup(): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  return downloadBackupFile('/admin/backup/export/storage', `saat-storage-${new Date().toISOString().slice(0, 10)}.zip`)
}

export async function importDatabaseBackup(file: File, confirm: string): Promise<{ ok: boolean; message: string }> {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('confirm', confirm)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/admin/backup/import/database`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
  } catch {
    return { ok: false, message: 'بازیابی دیتابیس ناموفق بود.' }
  }

  const payload = await response.json().catch(() => undefined)

  if (!response.ok || payload?.success === false) {
    return {
      ok: false,
      message:
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'بازیابی دیتابیس ناموفق بود.',
    }
  }

  const message =
    payload?.data?.message ??
    (typeof payload?.message === 'string' ? payload.message : 'دیتابیس با موفقیت بازیابی شد.')

  return { ok: true, message }
}
