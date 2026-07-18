import { fetchTeamLive, type TeamLiveData } from '@/services/teamLive'

const POLL_MS = 15_000

type Subscriber = {
  teamId: string | null
  onUpdate: (live: TeamLiveData) => void
}

const subscribers = new Set<Subscriber>()
let timer: ReturnType<typeof setInterval> | null = null
const inFlight = new Map<string, Promise<TeamLiveData>>()

function teamKey(teamId: string | null): string {
  return teamId ?? '__default__'
}

async function fetchDeduped(teamId: string | null): Promise<TeamLiveData> {
  const key = teamKey(teamId)
  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = fetchTeamLive(teamId).finally(() => {
    inFlight.delete(key)
  })
  inFlight.set(key, promise)
  return promise
}

function uniqueTeamIds(): Array<string | null> {
  return [...new Set([...subscribers].map((sub) => sub.teamId))]
}

async function pollOnce(): Promise<void> {
  if (typeof document !== 'undefined' && document.hidden) return

  const teamIds = uniqueTeamIds()
  await Promise.all(
    teamIds.map(async (teamId) => {
      try {
        const live = await fetchDeduped(teamId)
        for (const sub of subscribers) {
          if (sub.teamId === teamId) sub.onUpdate(live)
        }
      } catch {
        // Keep last good snapshot in each consumer.
      }
    }),
  )
}

function startPolling(): void {
  if (timer !== null) return
  void pollOnce()
  timer = setInterval(() => void pollOnce(), POLL_MS)
}

function stopPolling(): void {
  if (timer === null) return
  clearInterval(timer)
  timer = null
}

export function subscribeTeamLive(
  teamId: string | null,
  onUpdate: (live: TeamLiveData) => void,
): () => void {
  const sub: Subscriber = { teamId, onUpdate }
  subscribers.add(sub)
  startPolling()

  return () => {
    subscribers.delete(sub)
    if (subscribers.size === 0) stopPolling()
  }
}

export async function fetchTeamLiveNow(teamId: string | null): Promise<TeamLiveData> {
  return fetchDeduped(teamId)
}
