import type { Call, Followup, Lead } from '@/types'

export interface LeadNoteEntry {
  id: string
  text: string
  at: string
}

export function collectLeadNotes(lead: Lead, calls: Call[], followups: Followup[] = []): LeadNoteEntry[] {
  const entries: LeadNoteEntry[] = []

  for (const call of calls) {
    const text = call.note?.trim()
    if (!text) continue
    entries.push({ id: `call-${call.id}`, text, at: call.createdAt })
  }

  for (const event of lead.statusHistory ?? []) {
    const text = event.note?.trim()
    if (!text) continue
    entries.push({ id: `status-${event.id}`, text, at: event.at })
  }

  for (const followup of followups) {
    const text = followup.note?.trim()
    if (!text) continue
    entries.push({ id: `followup-${followup.id}`, text, at: followup.dueAt })
  }

  const profileNote = lead.lastNote?.trim()
  if (profileNote && !entries.some((e) => e.text === profileNote)) {
    entries.push({
      id: 'profile-last',
      text: profileNote,
      at: lead.lastCallAt ?? new Date(0).toISOString(),
    })
  }

  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
