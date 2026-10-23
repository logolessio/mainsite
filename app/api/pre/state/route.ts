import { featureOn } from '@/lib/features'
import { json, route } from '@/lib/http'
import { communityUrl } from '@/lib/discord/prelaunch'
import { discordIdFor } from '@/lib/discord/link'
import { db } from '@/lib/db'
import { paypalEmails } from '@/lib/paypal-emails'
import { googleOf, startPre } from '@/lib/prelaunch'
import { ensureProfile } from '@/lib/profile'
import { usernameOf } from '@/lib/profile-style'
import { getSession } from '@/lib/session'
import { requireUser } from '@/lib/user'

const mask = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')

/**
 * Everything the pre-launch sign-up page needs in one go: who is signed in, how far they have got, and which step to open. The first time a signed-in person
 * arrives, this also writes down where they came from (see `startPre`).
 */
export const GET = route(async (req: Request) => {
  const session = await getSession()
  if (!session?.user?.email) return json({ signedIn: false })
  const user = await requireUser()
  const [did, ceremony] = await Promise.all([discordIdFor(user.id), featureOn('payout-ceremony')])
  const pre = await startPre(req, user.id, did)
  const profile = await ensureProfile(user)
  const links = (() => {
    try {
      return JSON.parse(profile.links_json) as { platform: string; url: string }[]
    } catch {
      return []
    }
  })()
  const social = (p: string) => {
    const l = links.find((x) => x.platform === p)
    return l ? usernameOf(p, l.url) : ''
  }
  const [pay, google] = await Promise.all([paypalEmails(user.id), googleOf(user.email)])
  const d = await db()
  const discordName = did ? (await d.prepare('SELECT name FROM users WHERE id = ?1').bind(user.id).first<{ name: string | null }>())?.name ?? null : null
  const step = pre.n || pre.held || pre.denied ? 'done' : pre.profile ? 'paypal' : 'accounts'
  return json({
    signedIn: true,
    step,
    discord: { linked: Boolean(did), name: discordName },
    google: google ? mask(google) : null,
    image: user.image,
    profile: {
      saved: Boolean(pre.profile),
      name: profile.display_name,
      handle: profile.handle,
      tiktok: social('tiktok'),
      youtube: social('youtube'),
      instagram: social('instagram'),
    },
    paypal: pay.emails.map(mask),
    ceremony,
    done: Boolean(pre.done),
    held: Boolean(pre.held && !pre.n),
    denied: Boolean(pre.denied),
    n: pre.n ?? null,
    founding: pre.founding !== false,
    discordUrl: await communityUrl(),
  })
})
