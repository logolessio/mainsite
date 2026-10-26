'use server'

import { cookies } from 'next/headers'
import { isYtPassword, unlockToken, YT_COOKIE, YT_COOKIE_DAYS } from '@/lib/yt/gate'

type Result = { ok: true } | { error: string } | null

/**
 * The password form on yt.logoless.io. A wrong guess waits a moment before answering, to slow down guessing.
 * No redirect from here: the page lives at a rewritten address (/ is app/yt), and a router redirect to / would open the main site's home,
 * so the page reloads itself once the cookie is set.
 */
export async function unlockYt(_prev: Result, form: FormData): Promise<Result> {
  const typed = String(form.get('password') ?? '').slice(0, 200)
  const token = await unlockToken()
  if (!token || !(await isYtPassword(typed))) {
    await new Promise((r) => setTimeout(r, 900))
    return { error: token ? 'That’s not the password.' : 'This page has no password set yet.' }
  }
  ;(await cookies()).set(YT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: YT_COOKIE_DAYS * 24 * 60 * 60,
  })
  return { ok: true }
}

/** "Lock this page" at the bottom of the plan (the page reloads itself afterwards, see above). */
export async function lockYt(): Promise<void> {
  ;(await cookies()).delete(YT_COOKIE)
}
