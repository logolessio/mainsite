import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { verifyPassword } from '@/lib/password'
import { backupLeft, beginTwoStep, checkTwoStep, enableTwoStep, turnOffTwoStep, twoStepOn } from '@/lib/two-step'
import { requireUser } from '@/lib/user'

async function hasPassword(email: string) {
  return Boolean(await (await db()).prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(email).first())
}

/** Whether two-step sign-in is on for the signed-in person, and whether they can use it (it needs an email and password). */
export const GET = route(async () => {
  if (!(await featureOn('two-step-sign-in'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  const e = user.email.toLowerCase()
  return json({ on: await twoStepOn(e), available: await hasPassword(e), backupLeft: await backupLeft(e) })
})

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('begin') }),
  z.object({ action: z.literal('enable'), code: z.string().min(6).max(8) }),
  z.object({ action: z.literal('disable'), password: z.string().min(1).max(200), code: z.string().min(6).max(12) }),
])

export const POST = route(async (req: Request) => {
  if (!(await featureOn('two-step-sign-in'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'two-step', max: 30, windowSec: 900, userId: user.id })
  const e = user.email.toLowerCase()
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  if (!(await hasPassword(e))) throw new HttpError(409, 'You sign in with Google or Discord, which have their own second step. Two-step here is for email and password sign-in.')
  if (a.action === 'begin') {
    if (await twoStepOn(e)) throw new HttpError(409, 'Two-step sign-in is already on.')
    return json(await beginTwoStep(e))
  }
  if (a.action === 'enable') {
    const codes = await enableTwoStep(e, a.code)
    if (!codes) throw new HttpError(400, 'That code is not right. Check the app and try the new one it shows.')
    await auditSafe({ id: user.id, email: user.email }, 'security.two_step_on', user.id)
    return json({ codes })
  }
  const row = await (await db()).prepare('SELECT password_hash FROM credentials WHERE email = ?1').bind(e).first<{ password_hash: string }>()
  if (!(await verifyPassword(a.password, row?.password_hash)) || !(await checkTwoStep(e, a.code))) throw new HttpError(403, 'The password or the code is not right.')
  await turnOffTwoStep(e)
  await auditSafe({ id: user.id, email: user.email }, 'security.two_step_off', user.id)
  return json({ ok: true })
})
