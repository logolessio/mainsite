import { SITE } from './site'

// Pure money maths with no database in it, so pages and browser code can use it too.

/** The platform fee on a payout: charged to the brand on top, never taken from the clipper. */
export const feeFor = (payoutCents: number) => Math.round((payoutCents * SITE.platformFeePct) / 100)
/** What a brand pays for a payout budget: the budget itself plus the fee on top. */
export const costFor = (payoutBudgetCents: number) => payoutBudgetCents + feeFor(payoutBudgetCents)
