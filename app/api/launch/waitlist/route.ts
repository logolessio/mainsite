import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { emailEnabled, sendEmail, waitlistCodeEmail, waitlistWelcomeEmail } from '@/lib/email'
import { checkCode, issueCode } from '@/lib/email-code'
import { featureOn } from '@/lib/features'
import { hit, limit } from '@/lib/guard'
import { hasHuman } from '@/lib/human'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { addSignup, emailKey, handleProblem, normEmail, signupCounts, signupFor, unsubHeaders, unsubUrl, validEmail } from '@/lib/launch'
import { normHandle } from '@/lib/launch-page'
import { checkDevice, checkProof, ensureDevice, proofFor, recordDevice } from '@/lib/launch-waitlist'
import { requestMeta } from '@/lib/log'
import { ownerEmails } from '@/lib/roles'
import { getSession } from '@/lib/session'

const FP = z.string().regex(/^[0-9a-f]{64}$/).optional()
const schema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('hello') }),
  z.object({ step: z.literal('start'), email: z.string().max(254), fp: FP }),
  z.object({ step: z.literal('verify'), email: z.string().max(254), code: z.string().regex(/^\d{6}$/) }),
  z.object({ step: z.literal('finish'), email: z.string().max(254), proof: z.string().max(80), handle: z.string().max(40), fp: FP }),
])

/** Is the owner (an address in ADMIN_EMAILS) signed in on this request? Their devices are never limited. */
async function ownerSignedIn() {
  const email = (await getSession())?.user?.email?.toLowerCase()
  return Boolean(email && (await ownerEmails()).includes(email))
}

const withCookie = (data: unknown, set: string | null, status = 200) => {
  const res = json(data, status)
  if (set) res.headers.append('set-cookie', set)
  return res
}

/**
 * The waitlist on the coming-soon page, one step at a time:
 *   hello   gives the browser its device cookie (marked as the owner's when the owner is signed in)
 *   start   the human check, the one-spot-per-device check, then a six-digit code to the address
 *   verify  the code is right: hands back a proof that the address is theirs
 *   finish  reserves the username, records the device and sends the confirmation email (with a one-click unsubscribe)
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  if (!(await featureOn('launch-links'))) throw new HttpError(404, 'Not found.')
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const p = parsed.data
  const owner = await ownerSignedIn()
  const { device, set } = await ensureDevice(req, owner)
  const exempt = owner || device.owner

  if (p.step === 'hello') {
    await limit(req, { name: 'waitlist-hello', max: 60, windowSec: 600 })
    return withCookie({ ok: true, exempt }, set)
  }

  const email = normEmail(p.email)
  if (!validEmail(email)) throw new HttpError(400, 'Enter a valid email address.')
  const key = await emailKey(email)

  if (p.step === 'start') {
    await limit(req, { name: 'waitlist-start', max: 20, windowSec: 600 })
    if (!(await emailEnabled())) throw new HttpError(503, 'The waitlist cannot send email yet. Please try again soon.')
    if (!(await hasHuman(req))) throw new HttpError(403, 'Please complete the human check first.')
    // The owner's own address goes to sign-in instead: the owner is let in past the coming-soon page, not put on the list.
    if ((await ownerEmails()).includes(email)) return withCookie({ owner: true }, set)
    await checkDevice(req, device, p.fp, key, exempt)
    if ((await hit(`waitlist:addr:${key}`, 3600)) > 5) throw new HttpError(429, 'Too many codes for that address. Try again in an hour.')
    const code = await issueCode(email, 'waitlist')
    await sendEmail({ to: email, ...waitlistCodeEmail(code, false, await requestMeta(req)), template: 'waitlist code' })
    return withCookie({ sent: true }, set)
  }

  if (p.step === 'verify') {
    await limit(req, { name: 'waitlist-verify', max: 20, windowSec: 600 })
    const ok = await checkCode(email, 'waitlist', p.code)
    if (!ok) throw new HttpError(400, 'That code is not right, or it has expired. Check the 6 digits or ask for a new one.')
    const cur = await signupFor(key)
    return withCookie({ proof: await proofFor(email), handle: cur && !cur.u ? cur.h : null, already: Boolean(cur && !cur.u) }, set)
  }

  // finish
  await limit(req, { name: 'waitlist-finish', max: 12, windowSec: 600 })
  if (!(await checkProof(email, p.proof))) throw new HttpError(401, 'Your confirmation ran out. Please enter your email again.')
  const handle = normHandle(p.handle)
  const problem = await handleProblem(handle, key)
  if (problem) throw new HttpError(409, problem)
  await checkDevice(req, device, p.fp, key, exempt)
  let r: { handle: string | null; already: boolean }
  try {
    r = await addSignup(email, handle)
  } catch (e) {
    if (e instanceof Error && e.message === 'taken') throw new HttpError(409, 'Somebody has just reserved that name. Try another.')
    throw e
  }
  await recordDevice(req, device, p.fp, key, exempt)
  const position = r.already ? null : (await signupCounts()).total
  const row = await signupFor(key)
  const url = await unsubUrl(email)
  try {
    await sendEmail({ to: email, ...waitlistWelcomeEmail({ email, handle: r.handle, joinedAt: row?.t ?? Math.floor(Date.now() / 1000), position, unsubscribe: url }), headers: unsubHeaders(url), template: 'waitlist welcome' })
  } catch {
    /* they are on the list; the confirmation is a courtesy and is not worth failing over */
  }
  await auditSafe({ id: null, email: 'system' }, 'waitlist.joined', null, r.already ? 'again' : 'new')
  return withCookie({ ok: true, handle: r.handle, position, already: r.already }, set)
})

/** Is a username free to reserve? Asked while the person types. */
export const GET = route(async (req: Request) => {
  await limit(req, { name: 'waitlist-handle', max: 120, windowSec: 600 })
  const h = normHandle(new URL(req.url).searchParams.get('h') ?? '')
  const problem = await handleProblem(h)
  return json(problem ? { ok: false, problem } : { ok: true })
})
