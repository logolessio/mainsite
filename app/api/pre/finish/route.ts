import { hasHuman } from '@/lib/human'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { communityUrl, grantFounding } from '@/lib/discord/prelaunch'
import { notifyAdmins } from '@/lib/notify'
import { finishPre, getPre } from '@/lib/prelaunch'
import { getLinks } from '@/lib/socials-db'
import { requireUser } from '@/lib/user'

/**
 * The last press. A person proves they are one (Cloudflare's check, once the keys are set), then either gets the Founding member role at once or, if the
 * sign-up looked odd (see `finishPre`), waits for the owner. Safe to press twice.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'pre-finish', max: 12, windowSec: 600, userId: user.id })
  const pre = await getPre(user.id)
  if (!pre?.profile) throw new HttpError(400, 'Finish your profile first.')
  if (!pre.n && !(await hasHuman(req))) return json({ error: 'Please complete the quick check.', needHuman: true }, 403)
  const was = pre.n
  const next = await finishPre(user.id)
  const inServer = next.n && !was ? await grantFounding(user.id, next.n) : true
  if (next.held && !pre.held) {
    await notifyAdmins({ title: `A sign-up needs a look: ${user.name ?? user.email}`, body: next.flags.join(' · ').slice(0, 220), href: '/admin/discord', dedupe: `prelaunch-held:${user.id}` })
  }
  return json({
    ok: true,
    held: Boolean(next.held && !next.n),
    n: next.n ?? null,
    inServer,
    invite: inServer ? null : ((await getLinks()).find((l) => l.platform === 'discord' && l.url.startsWith('https://'))?.url ?? null),
    discordUrl: await communityUrl(),
  })
})
