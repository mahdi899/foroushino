import type { Availability, AvailabilityAutoReason, WorkSession } from '@/types'
import { isShiftOpen } from '@/lib/shiftUtils'

export function canAutoSetAvailability(
  availability: Availability,
  workSession: WorkSession | null,
  activeCallLeadId: string | null,
  next: Availability,
): boolean {
  if (!isShiftOpen(workSession)) return false
  if (availability === 'on_break' || availability === 'offline') return false
  if (activeCallLeadId && next !== 'in_call') return false
  return true
}

export function shouldApplyFollowUpRouteStatus(
  availability: Availability,
  activeCallLeadId: string | null,
): boolean {
  if (activeCallLeadId) return false
  if (availability === 'on_break' || availability === 'offline') return false
  if (availability === 'in_call') return false
  return true
}

export function shouldMarkAwayFromApp(
  availability: Availability,
  activeCallLeadId: string | null,
): boolean {
  if (activeCallLeadId) return false
  return availability === 'available' || availability === 'doing_follow_up'
}
export function shouldRestoreOnReturn(
  availability: Availability,
  autoReason: AvailabilityAutoReason | null,
  activeCallLeadId: string | null,
): Availability | null {
  if (activeCallLeadId) return null
  if (availability === 'doing_follow_up' && autoReason === 'follow_up_route') return null
  if (availability === 'doing_follow_up') return 'available'
  // Legacy: away-from-app used to set in_call before switching to doing_follow_up.
  if (availability === 'in_call') return 'available'
  return null
}
