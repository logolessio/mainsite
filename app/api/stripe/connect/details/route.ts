import type Stripe from 'stripe'
import { connectStatus, stripeProblem } from '@/lib/connect'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

type In = {
  firstName?: string
  lastName?: string
  dob?: { day?: number; month?: number; year?: number }
  address?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string }
  phone?: string
  idNumber?: string
  ssnLast4?: string
  documentFront?: string
  documentBack?: string
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const fileId = (v: unknown) => (typeof v === 'string' && /^file_[A-Za-z0-9]{8,64}$/.test(v) ? v : undefined)

/**
 * Passes what the clipper typed straight on to Stripe. Nothing here is saved in logoless's database or logs:
 * only the names of the fields that changed are recorded.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'connect-details', max: 30, windowSec: 3600, userId: user.id })
  if (!user.stripe_account_id) throw new HttpError(400, 'Pick your country first.')
  const b = await body<In>(req)
  const ind: Stripe.AccountUpdateParams.Individual = {}
  const changed: string[] = []

  if (b.firstName !== undefined) (ind.first_name = text(b.firstName, 60)), changed.push('name')
  if (b.lastName !== undefined) ind.last_name = text(b.lastName, 60)
  if (b.dob) {
    const { day, month, year } = b.dob
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year) || day! < 1 || day! > 31 || month! < 1 || month! > 12 || year! < 1900 || year! > new Date().getFullYear()) throw new HttpError(400, 'Check the date of birth.')
    ind.dob = { day: day!, month: month!, year: year! }
    changed.push('dob')
  }
  if (b.address) {
    const a = b.address
    ind.address = { line1: text(a.line1, 100), line2: text(a.line2, 100) || undefined, city: text(a.city, 60), state: text(a.state, 40) || undefined, postal_code: text(a.postalCode, 20) }
    changed.push('address')
  }
  if (b.phone !== undefined) {
    const p = text(b.phone, 25)
    if (!/^\+?[0-9 ()-]{7,20}$/.test(p)) throw new HttpError(400, 'Enter a phone number, including the country code.')
    ind.phone = p
    changed.push('phone')
  }
  if (b.idNumber) (ind.id_number = text(b.idNumber, 30)), changed.push('id')
  if (b.ssnLast4) {
    if (!/^\d{4}$/.test(b.ssnLast4)) throw new HttpError(400, 'Enter exactly the last 4 digits.')
    ind.ssn_last_4 = b.ssnLast4
    changed.push('id')
  }
  const front = fileId(b.documentFront)
  if (front) {
    ind.verification = { document: { front, back: fileId(b.documentBack) } }
    changed.push('document')
  }
  if (!changed.length) throw new HttpError(400, 'Nothing to save.')

  try {
    const s = await stripe()
    await s.accounts.update(user.stripe_account_id, { individual: ind })
  } catch (e) {
    throw stripeProblem(e)
  }
  logEvent({ kind: 'money', name: 'payout details saved', actor: user.email, detail: [...new Set(changed)].join(', '), req })
  return json(await connectStatus(user))
})
