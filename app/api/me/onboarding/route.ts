import { z } from 'zod'
import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notifyAdmins } from '@/lib/notify'
import { ensureProfile, saveProfile } from '@/lib/profile'
import { buildLink } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

const COUNTRY: Record<string, string> = {
  'United States': 'US', 'United Kingdom': 'GB', Canada: 'CA', Australia: 'AU', Ireland: 'IE', Germany: 'DE', France: 'FR', Netherlands: 'NL', Spain: 'ES', Singapore: 'SG',
}

const schema = z.object({
  role: z.enum(['clipper', 'brand']),
  name: z.string().trim().max(60).optional(),
  handle: z.string().trim().max(24).optional(),
  bio: z.string().max(400).optional(),
  country: z.string().max(40).optional(),
  avatarKey: z.string().regex(/^([0-9a-f-]{36}|g:[a-z]{2,12})$/).nullable().optional(),
  linked: z.record(z.string().max(20), z.string().trim().max(80)).optional(),
  niches: z.array(z.string().max(40)).max(12).optional(),
  company: z.string().trim().max(60).optional(),
  website: z.string().trim().max(200).optional(),
  industry: z.string().max(60).optional(),
  goals: z.array(z.string().max(60)).max(8).optional(),
  budget: z.string().max(40).optional(),
})

/** The end of the sign-up flow: what the person told us becomes their real profile. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'onboarding', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 16 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Please check what you filled in.')
  const a = parsed.data
  await ensureProfile(user)

  const links: { platform: string; url: string }[] = []
  for (const [platform, handle] of Object.entries(a.linked ?? {})) {
    const built = buildLink(platform, handle)
    if ('url' in built) links.push({ platform, url: built.url })
  }
  if (a.role === 'brand' && a.website) {
    const built = buildLink('website', a.website)
    if ('url' in built) links.push({ platform: 'website', url: built.url })
  }

  if (a.role === 'clipper') {
    await saveProfile(user, {
      ...(a.name ? { displayName: a.name } : {}),
      ...(a.handle ? { handle: a.handle } : {}),
      bio: a.bio ?? '',
      country: a.country ? (COUNTRY[a.country] ?? null) : null,
      ...(a.avatarKey ? { avatar: a.avatarKey } : {}),
      ...(links.length ? { links } : {}),
      ...(a.niches?.length ? { niches: a.niches } : {}),
    })
  } else {
    await saveProfile(user, { ...(a.company ? { displayName: a.company } : {}), ...(a.avatarKey ? { avatar: a.avatarKey } : {}), ...(links.length ? { links } : {}) })
    // brands are leads: tell the team who just arrived and what they want
    await notifyAdmins({
      title: `New brand: ${a.company ?? user.email}`,
      body: [a.industry, a.budget, a.goals?.join(', ')].filter(Boolean).join(' · ').slice(0, 220),
      href: '/admin/users',
      dedupe: `brand-signup:${user.id}`,
    })
  }
  const d = await db()
  await d.prepare('UPDATE users SET name = COALESCE(?2, name) WHERE id = ?1').bind(user.id, a.name || a.company || null).run()
  // say hello in the Discord server, once, now that the account exists
  const { welcomeMember } = await import('@/lib/discord/outbound')
  await welcomeMember(user.id)
  return json({ ok: true })
})
