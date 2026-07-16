import { useStore } from '@/store/useStore'
import type { PaymentMethod } from '@/types'
import { apiMode, api } from '@/services/index'
import { enqueueOfflineWrite } from '@/services/offlineQueue'
import { patchSaleConfirmData, patchSaleRejectData } from '@/services/patchSaleWrite'

export async function performConfirmSale(saleId: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().confirmSale(saleId)
    return
  }

  const data = await api.confirmSale(saleId)
  patchSaleConfirmData(data)
}

export async function performRejectSale(saleId: string, reason: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().rejectSale(saleId, reason)
    return
  }

  const data = await api.rejectSale(saleId, reason)
  patchSaleRejectData(data)
}

export async function performSubmitPayment(
  saleId: string,
  method: PaymentMethod,
  reference: string,
): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().submitPayment(saleId, method, reference)
    return
  }

  try {
    await api.submitPayment(saleId, method, reference)
    useStore.getState().submitPayment(saleId, method, reference)
  } catch {
    await enqueueOfflineWrite({
      type: 'submit_payment',
      saleId,
      method,
      reference,
      createdAt: new Date().toISOString(),
    })
    throw new Error('ثبت پرداخت ناموفق بود و در صف آفلاین ذخیره شد.')
  }
}

export async function flushPendingSaleWrites(): Promise<void> {
  const { flushOfflineQueue } = await import('@/services/offlineQueue')
  await flushOfflineQueue()
}
