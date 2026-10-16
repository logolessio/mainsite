import { finishConnect, safeBack, siteOrigin } from '@/lib/discord/connect'
import { getSession } from '@/lib/session'
import { requireUser } from '@/lib/user'

/** Discord sends the person back here after they approve (or refuse). The one-time code is turned into a link between the two accounts. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const origin = siteOrigin(req)
  const go = (back: string, result: string) => Response.redirect(`${origin}${safeBack(back)}${safeBack(back).includes('?') ? '&' : '?'}discord=${result}`, 302)
  if (url.searchParams.get('error')) return go('/dashboard/settings', 'cancelled')
  const code = url.searchParams.get('code') ?? ''
  const state = url.searchParams.get('state') ?? ''
  if (!code || !/^[0-9a-f]{36}$/.test(state)) return go('/dashboard/settings', 'error')
  if (!(await getSession())?.user?.email) return Response.redirect(`${origin}/login`, 302)
  try {
    const user = await requireUser()
    const r = await finishConnect({ userId: user.id, code, state, origin })
    return go(r.back, r.ok ? (r.joined ? 'joined' : 'linked') : r.why === 'taken' ? 'taken' : r.why === 'setup' ? 'setup' : 'error')
  } catch (e) {
    console.error('discord callback failed', e instanceof Error ? e.message : e)
    return go('/dashboard/settings', 'error')
  }
}
