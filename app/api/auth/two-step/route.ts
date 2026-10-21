import { z } from 'zod'
import { db } from '@/lib/db'
import { hit } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { verifyPassword } from '@/lib/password'
import { twoStepOn } from '@/lib/two-step'

const schema = z.object({ email: z.string().max(200), password: z.string().min(1).max(200) })

/**
 * Asked by the log in page after the person types their email and password, to know whether to ask for a code too. It answers "yes" only when the
 * password is right and two-step is on; for a wrong password it says "no", and the normal sign-in then fails the way it always does.
 */
export const POST = route(async (req: Request) => {
  const p = schema.safeParse(await body(req, 1024))
  const email = p.success ? p.data.email.trim().toLowerCase() : ''
  if (!p.success || !/^\S+@\S+\.\S+$/.test(email)) return json({ needed: false })
  if ((await hit(`2fa-needed:${email}`, 900)) > 12) return json({ needed: false })
  const row = await (await db()).prepare('SELECT password_hash FROM credentials WHERE email = ?1').bind(email).first<{ password_hash: string }>()
  const ok = await verifyPassword(p.data.password, row?.password_hash)
  return json({ needed: ok && (await twoStepOn(email)) })
})
