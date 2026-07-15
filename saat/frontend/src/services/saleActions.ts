import { useStore } from '@/store/useStore'
import type { PaymentMethod } from '@/types'
import { apiMode, api } from '@/services/index'
import { enqueueOfflineWrite, flushOfflineQueue } from '@/services/offlineQueue'

export async function performConfirmSale(saleId: string): Promise<void> {
  useStore.getState().confirmSale(saleId)
  if (apiMode !== 'http') return

  try {
    await api.confirmSale(saleId)
  } catch {
    await enqueueOfflineWrite({ type: 'confirm_sale', saleId, createdAt: new Date().toISOString() })
  }
}

export async function performRejectSale(saleId: string, reason: string): Promise<void> {
  useStore.getState().rejectSale(saleId, reason)
  if (apiMode !== 'http') return

  await api.rejectSale(saleId, reason)
}

export async function performSubmitPayment(
  saleId: string,
  method: PaymentMethod,
  reference: string,
): Promise<void> {
  useStore.getState().submitPayment(saleId, method, reference)
  if (apiMode !== 'http') return

  try {
    await api.submitPayment(saleId, method, reference)
  } catch {
    await enqueueOfflineWrite({
      type: 'submit_payment',
      saleId,
      method,
      reference,
      createdAt: new Date().toISOString(),
    })
  }
}

export async function flushPendingSaleWrites(): Promise<void> {
  await flushOfflineQueue()
}
