import { positiveResults } from '@/data/labels'
import { dateKeyFromIso, todayDateKey } from '@/lib/shiftUtils'
import type { Agent, Call } from '@/types'

export function countAgentCallsOnDate(calls: Call[], agentId: string, date: string): number {
  return calls.filter(
    (call) => call.agentId === agentId && dateKeyFromIso(call.createdAt) === date,
  ).length
}

export function countAgentSuccessfulOnDate(calls: Call[], agentId: string, date: string): number {
  return calls.filter(
    (call) =>
      call.agentId === agentId &&
      dateKeyFromIso(call.createdAt) === date &&
      positiveResults.includes(call.result),
  ).length
}

export function applyDailyStatsToAgent(
  agent: Agent,
  calls: Call[],
  dailyStatsDate: string | null,
  nowMs = Date.now(),
): Agent {
  const today = todayDateKey(new Date(nowMs))
  const fromCalls = countAgentCallsOnDate(calls, agent.id, today)
  const fromSuccess = countAgentSuccessfulOnDate(calls, agent.id, today)

  if (dailyStatsDate !== today) {
    return { ...agent, callsToday: fromCalls, successfulToday: fromSuccess }
  }

  return {
    ...agent,
    callsToday: Math.max(agent.callsToday, fromCalls),
    successfulToday: Math.max(agent.successfulToday, fromSuccess),
  }
}

export function syncAllAgentsDailyStats(
  agents: Agent[],
  calls: Call[],
  dailyStatsDate: string | null,
  nowMs = Date.now(),
): { agents: Agent[]; dailyStatsDate: string } {
  const today = todayDateKey(new Date(nowMs))

  return {
    agents: agents.map((agent) => applyDailyStatsToAgent(agent, calls, dailyStatsDate, nowMs)),
    dailyStatsDate: today,
  }
}
