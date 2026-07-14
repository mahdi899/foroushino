import { apiMode } from '@/services/index'
import { http } from '@/services/http'
import { performStartCall, performSubmitCallResult } from '@/services/callActions'
import { performLockLead, performReturnLeadToPool } from '@/services/leadActions'
import { performConfirmSale, performSubmitPayment } from '@/services/saleActions'
import type { CallResultInput } from '@/services/client'
import type { PaymentMethod } from '@/types'

const STORAGE_KEY = 'saat-offline-queue-v1'

export type OfflineWrite =
  | { id: string; type: 'start_call'; leadId: string; method: 'native' | 'voip'; createdAt: string }
  | { id: string; type: 'submit_call_result'; input: CallResultInput; createdAt: string }
  | { id: string; type: 'lock_lead'; leadId: string; createdAt: string }
  | { id: string; type: 'return_lead'; leadId: string; createdAt: string }
  | { id: string; type: 'confirm_sale'; saleId: string; createdAt: string }
  | {
      id: string
      type: 'submit_payment'
      saleId: string
      method: PaymentMethod
      reference: string
      createdAt: string
    }

function readQueue(): OfflineWrite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as OfflineWrite[]) : []
  } catch {
    return []
  }
}

function writeQueue(items: OfflineWrite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }

export type OfflineWriteInput =
  | Omit<Extract<OfflineWrite, { type: 'start_call' }>, 'id'>
  | Omit<Extract<OfflineWrite, { type: 'submit_call_result' }>, 'id'>
  | Omit<Extract<OfflineWrite, { type: 'lock_lead' }>, 'id'>
  | Omit<Extract<OfflineWrite, { type: 'return_lead' }>, 'id'>
  | Omit<Extract<OfflineWrite, { type: 'confirm_sale' }>, 'id'>
  | Omit<Extract<OfflineWrite, { type: 'submit_payment' }>, 'id'>

export async function enqueueOfflineWrite(item: OfflineWriteInput): Promise<void> {
  const queue = readQueue()
  queue.push({ ...item, id: crypto.randomUUID() } as OfflineWrite)
  writeQueue(queue)
}

export async function flushOfflineQueue(): Promise<number> {
  if (apiMode !== 'http' || !navigator.onLine) return 0

  const queue = readQueue()
  if (queue.length === 0) return 0

  const remaining: OfflineWrite[] = []
  let flushed = 0

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'start_call':
          await performStartCall(item.leadId, item.method)
          break
        case 'submit_call_result':
          await performSubmitCallResult(item.input)
          break
        case 'lock_lead':
          await performLockLead(item.leadId)
          break
        case 'return_lead':
          await performReturnLeadToPool(item.leadId)
          break
        case 'confirm_sale':
          await performConfirmSale(item.saleId)
          break
        case 'submit_payment':
          await performSubmitPayment(item.saleId, item.method, item.reference)
          break
      }
      flushed += 1
    } catch {
      remaining.push(item)
    }
  }

  writeQueue(remaining)
  return flushed
}

export function pendingOfflineCount(): number {
  return readQueue().length
}

export async function testVoipConnection(): Promise<{ ok: boolean; message: string }> {
  const data = await http.post<{ ok: boolean; message: string }>('/telephony/test-connection')
  return data
}
