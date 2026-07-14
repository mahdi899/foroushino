/**
 * Live end-to-end verification of `src/services/httpClient.ts` against a
 * running Laravel backend. Exercises the full agent lifecycle through the
 * *actual* shipped client code (not a re-implementation): dev-login, shift
 * start, next-lead suggestion, lock, call, result routing, follow-up,
 * payment/confirmation (as a manager), and a payout request.
 *
 * Usage (from saat/frontend):
 *   VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1 npx tsx scripts/verify-http-client.ts
 */

// --- minimal Node polyfill for the browser globals httpClient/auth touch ---
const memoryStore = new Map<string, string>()
;(globalThis as any).localStorage = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => void memoryStore.set(k, v),
  removeItem: (k: string) => void memoryStore.delete(k),
}

const BASE_URL = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

let passed = 0
let failed = 0

function ok(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++
    console.log(`  \u2713 ${label}`)
  } else {
    failed++
    console.log(`  \u2717 ${label}`, detail !== undefined ? JSON.stringify(detail) : '')
  }
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  try {
    const result = await fn()
    console.log(`\u2192 ${label}`)
    return result
  } catch (e) {
    failed++
    console.error(`\u2717 ${label} threw:`, e instanceof Error ? e.message : e)
    throw e
  }
}

async function main() {
  const { httpClient } = await import('../src/services/httpClient')
  const { login, setToken } = await import('../src/services/auth')
  const http = await import('../src/services/http')

  console.log(`Verifying httpClient against ${BASE_URL}\n`)

  // 1. auth (dev-login fallback, since this isn't running inside Telegram)
  const agent = await step('dev-login as an agent', () => login({ role: 'agent' }))
  ok('received a user profile', !!agent && !!agent.id, agent)

  // Managers/supervisors are needed later to confirm a sale.
  const manager = await step('dev-login as a manager (separate token)', async () => {
    const res = await http.request<{ token: string; user: { id: number; name: string } }>('/auth/dev-login', {
      method: 'POST',
      body: { role: 'manager' },
    })
    return res
  })
  ok('manager token issued', !!manager.token)

  // re-authenticate as the agent for the rest of the flow
  await login({ role: 'agent' })

  // 2. shift & availability
  await step('start shift', () => httpClient.startShift())
  await step('set availability to available', () => httpClient.setAvailability('available'))

  // 3. next lead suggestion (locks it for the agent)
  const suggestion = await step('get next suggested lead', () => httpClient.getNextLead())
  ok('a lead was suggested', !!suggestion?.lead, suggestion)
  if (!suggestion) throw new Error('no lead available to continue the flow — seed more leads and retry')
  const leadId = suggestion.lead.id
  console.log(`  lead #${leadId} (${suggestion.lead.firstName} ${suggestion.lead.lastName}), reason=${suggestion.reason}`)

  // 4. explicit lock (extends the lock the assignment already holds)
  const lockResult = await step('lock the suggested lead', () => httpClient.lockLead(leadId))
  ok('lock succeeded', lockResult.ok, lockResult)

  // 5. start a call, then submit a result that creates a follow-up
  await step('start call', () => httpClient.startCall(leadId))
  const outcome = await step('submit call result (needs_followup)', () =>
    httpClient.submitCallResult({
      leadId,
      result: 'needs_followup',
      note: 'مکالمه خوب بود، فردا پیگیری کن',
      objection: null,
      nextStage: 'follow_up',
      rating: 4,
      followupAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      followupKind: 'call',
      durationSec: 95,
    }),
  )
  ok('follow-up was created', !!outcome.createdFollowupId, outcome)
  ok('next-action label resolved', outcome.nextActionLabel.length > 0, outcome.nextActionLabel)
  ok('saved note echoed in outcome', outcome.savedNote === 'مکالمه خوب بود، فردا پیگیری کن', outcome.savedNote)

  // 6. standalone follow-up creation, complete, snooze
  const followup = await step('create a standalone follow-up', () =>
    httpClient.createFollowup({
      leadId,
      kind: 'call',
      title: 'پیگیری آزمایشی',
      dueAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      priority: 2,
    }),
  )
  ok('follow-up has an id', !!followup.id, followup)
  await step('snooze the follow-up', () => httpClient.snoozeFollowup(followup.id, new Date(Date.now() + 7200 * 1000).toISOString()))
  await step('complete the follow-up', () => httpClient.completeFollowup(followup.id))

  // 7. release the lead lock, return to pool, reclaim it
  await step('release lead lock', () => httpClient.releaseLead(leadId))
  await step('return lead to pool', () => httpClient.returnLeadToPool(leadId))
  await step('reclaim lead from pool', () => httpClient.reclaimLead(leadId))

  // 8. sale lifecycle: start another call, log a payment-pending sale
  const suggestion2 = await step('get next suggested lead for sale flow', () => httpClient.getNextLead())
  if (suggestion2) {
    const leadId2 = suggestion2.lead.id
    await step('start call for sale lead', () => httpClient.startCall(leadId2))
    const saleOutcome = await step('submit call result (payment_pending)', () =>
      httpClient.submitCallResult({
        leadId: leadId2,
        result: 'payment_pending',
        note: 'مشتری آماده پرداخت است',
        objection: null,
        nextStage: 'payment_pending',
        rating: 5,
        followupAt: null,
        durationSec: 140,
        saleAmount: 4_500_000,
      }),
    )
    ok('sale was created', !!saleOutcome.createdSaleId, saleOutcome)

    if (saleOutcome.createdSaleId) {
      const saleId = saleOutcome.createdSaleId
      await step('submit payment for the sale', () => httpClient.submitPayment(saleId, 'card', 'REF-TEST-001'))

      // confirm as manager
      setToken(manager.token)
      await step('confirm sale as manager', () => httpClient.confirmSale(saleId))
      await login({ role: 'agent' })
    }
  } else {
    console.log('  (skipped sale flow — no second lead available)')
  }

  // 9. wallet / payout guard rail
  const payout = await step('request an oversized payout (should be rejected)', () => httpClient.requestPayout(999_999_999))
  ok('oversized payout was rejected', payout.ok === false, payout)

  // 10. end shift
  await step('end shift', () => httpClient.endShift())

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error('\nVerification aborted:', e instanceof Error ? e.message : e)
  console.log(`\n${passed} passed, ${failed + 1} failed`)
  process.exit(1)
})
