import type { Availability, WorkSession } from '@/types'

export const PRODUCTIVE_AVAILABILITIES: Availability[] = ['available', 'in_call', 'doing_follow_up']

export function isProductiveAvailability(status: Availability): boolean {
  return PRODUCTIVE_AVAILABILITIES.includes(status)
}

export function isShiftOpen(session: WorkSession | null | undefined): boolean {
  return Boolean(session?.startedAt && !session?.endedAt)
}

export function calcLiveProductiveSeconds(
  session: WorkSession,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  let total = session.totalProductiveSeconds ?? 0

  if (isProductiveAvailability(availability) && availabilityChangedAt) {
    total += Math.max(0, Math.floor((nowMs - new Date(availabilityChangedAt).getTime()) / 1000))
  }

  return total
}

export function calcLiveBreakSeconds(
  session: WorkSession,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  let total = session.totalBreakSeconds ?? 0

  if (
    availability !== 'offline' &&
    !isProductiveAvailability(availability) &&
    availabilityChangedAt
  ) {
    total += Math.max(0, Math.floor((nowMs - new Date(availabilityChangedAt).getTime()) / 1000))
  }

  return total
}
