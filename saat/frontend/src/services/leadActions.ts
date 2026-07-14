import { useStore } from '@/store/useStore'
import { apiMode, api } from '@/services/index'
import { syncAppData } from '@/services/sync'
import { enqueueOfflineWrite, flushOfflineQueue } from '@/services/offlineQueue'

export async function performLockLead(leadId: string): Promise<{ ok: boolean; lockedByOther?: boolean }> {
  if (apiMode !== 'http') {
    return useStore.getState().lockLead(leadId)
  }

  try {
    const result = await api.lockLead(leadId)
    if (result.ok) {
      const payload = await syncAppData()
      useStore.getState().applySyncData(payload)
    }
    return result
  } catch {
    await enqueueOfflineWrite({ type: 'lock_lead', leadId, createdAt: new Date().toISOString() })
    return { ok: false }
  }
}

export async function performReturnLeadToPool(leadId: string): Promise<void> {
  useStore.getState().returnLeadToPool(leadId)
  if (apiMode !== 'http') return

  try {
    await api.returnLeadToPool(leadId)
    const payload = await syncAppData()
    useStore.getState().applySyncData(payload)
  } catch {
    await enqueueOfflineWrite({ type: 'return_lead', leadId, createdAt: new Date().toISOString() })
  }
}

export async function performReclaimLead(leadId: string): Promise<void> {
  useStore.getState().reclaimLead(leadId)
  if (apiMode !== 'http') return

  await api.reclaimLead(leadId)
  const payload = await syncAppData()
  useStore.getState().applySyncData(payload)
}

export async function flushPendingLeadWrites(): Promise<void> {
  await flushOfflineQueue()
}
