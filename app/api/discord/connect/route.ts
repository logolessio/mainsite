import { authorizeUrl } from '@/lib/discord/oauth'
import { oauthClient, safeBack, siteOrigin, startConnect } from '@/lib/discord/connect'
import { limit } from '@/lib/guard'
import { getSession } from '@/lib/session'
import { requireUser } from '@/lib/user'

/**
 * "Connect Discord": sends a signed-in person to Discord to approve (who they are, and that the bot may add them to the server).
 * Someone who is not signed in is sent to log in first and then comes straight back here.
 */
export async function GET(req: Request) {
  const origin = siteOrigin(req)
  const back = safeBack(new URL(req.url).searchParams.get('back'))
  if (!(await getSession())?.user?.email) return Response.redirect(`${origin}/login?next=${encodeURIComponent(`/api/discord/connect?back=${encodeURIComponent(back)}`)}`, 302)
  try {
    const user = await requireUser()
    await limit(req, { name: 'discord-connect', max: 20, windowSec: 600, userId: user.id })
    const client = await oauthClient()
    if (!client) return Response.redirect(`${origin}${back}${back.includes('?') ? '&' : '?'}discord=setup`, 302)
    return Response.redirect(authorizeUrl({ clientId: client.id, origin, state: await startConnect(user.id, back) }), 302)
  } catch (e) {
    console.error('discord connect failed', e instanceof Error ? e.message : e)
    return Response.redirect(`${origin}${back}${back.includes('?') ? '&' : '?'}discord=error`, 302)
  }
}
