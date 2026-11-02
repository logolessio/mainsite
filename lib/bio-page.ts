import { type BioBlock, type BioConfig, DEFAULT_BIO, cleanBlock, normalizeBio } from './bio'
import { getBio, totalViews } from './bio-store'
import { db } from './db'
import { isFoundingMember } from './prelaunch'
import { profileByHandle } from './profile'
import type { ProfileVisibility } from './profile-extras'
import type { BioPageData } from '@/components/bio/context'

export type BioLookup = { data: BioPageData; userId: string; visibility: ProfileVisibility; suspended: boolean; indexable: boolean }

/** The picture a page shows: the one the person uploaded, or nothing (the page then shows their initial in grey, never one of the coloured stand-ins). */
const pictureOf = (key: string | null) => (key && !key.startsWith('g:') && /^[0-9a-f-]{36}$/.test(key) ? `/api/img/${key}` : null)

/**
 * What logoless.io/<name> shows, or null when nobody has that name. A person who has not made a page yet still has one: their name, their words and the
 * accounts they already linked, in the standard look.
 */
export async function bioLookup(handle: string): Promise<BioLookup | null> {
  const p = await profileByHandle(handle).catch(() => null)
  if (!p) return null
  const saved = await getBio(p.userId)
  let config: BioConfig = saved ?? DEFAULT_BIO
  if (!saved) {
    const socials = p.view.links.map((l) => cleanBlock({ t: 'social', platform: l.platform, url: l.url })).filter((b): b is BioBlock => b !== null)
    config = normalizeBio({ ...DEFAULT_BIO, blocks: socials })
  }
  const views = config.meta.views ? await totalViews(p.userId).catch(() => null) : null
  const badges: NonNullable<BioPageData['badges']> = []
  if (config.meta.badges) {
    // the number of the account (the order people made their page in), and the marks that come with the early ones
    const rank = await (await db()).prepare('SELECT COUNT(*) AS n FROM profiles WHERE created_at < ?1').bind(p.row.created_at).first<{ n: number }>().catch(() => null)
    const uid = (rank?.n ?? 0) + 1
    badges.push({ id: 'uid', label: String(uid), hint: `Account number ${uid}` })
    if (uid <= 100) badges.push({ id: 'og', label: 'OG', hint: 'One of the first hundred' })
    if (await isFoundingMember(p.userId).catch(() => false)) badges.push({ id: 'founding', label: 'Founding', hint: 'Signed up before logoless opened' })
  }
  return {
    userId: p.userId,
    visibility: p.view.extras.privacy.profile,
    suspended: p.suspended,
    indexable: config.meta.index && p.view.extras.privacy.profile === 'public',
    data: { handle: p.view.handle, name: p.view.displayName, bio: p.view.bio, avatar: pictureOf(p.row.avatar_key), config, views, badges },
  }
}
