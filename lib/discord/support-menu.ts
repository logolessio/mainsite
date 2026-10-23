import { FAQ } from '../faq'
import type { IconName } from './icon-names'

/**
 * What the two drop-down menus on the support panel offer. One reads an answer (the FAQ, 25 of its questions: the rest is `/faq`), the other opens a ticket for one of
 * five reasons or "something else". Pure data: the panel (panels-new.ts) draws them and the bot (commands.ts) answers them.
 */
export const FAQ_FLAT = Object.entries(FAQ).flatMap(([group, list]) => list.map((f) => ({ ...f, group })))

/** Up to seven questions from each group, in the order they are written, 25 in all (a menu holds no more). */
export const FAQ_PICKS = (() => {
  const seen: Record<string, number> = {}
  const out: { index: number; q: string; group: string }[] = []
  FAQ_FLAT.forEach((f, index) => {
    seen[f.group] = (seen[f.group] ?? 0) + 1
    if (seen[f.group] <= 7 && out.length < 25) out.push({ index, q: f.q, group: f.group })
  })
  return out
})()

export const REASONS: { key: string; label: string; description: string; icon: IconName }[] = [
  { key: 'payments', label: 'Payments and withdrawals', description: 'A payout, PayPal or your balance', icon: 'wallet' },
  { key: 'submissions', label: 'A submission or a campaign', description: 'A review, views or a brief', icon: 'clip' },
  { key: 'account', label: 'My account or signing in', description: 'Log in, email, profile or settings', icon: 'user' },
  { key: 'linking', label: 'Linking or proving an account', description: 'TikTok, YouTube or Instagram', icon: 'link' },
  { key: 'brands', label: 'Starting a campaign', description: 'For brands and artists', icon: 'campaign' },
  { key: 'other', label: 'Something else', description: 'Anything we have not listed', icon: 'help' },
]
