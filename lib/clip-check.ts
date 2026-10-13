import { usernameOf } from './profile-style'

export type Check = { id: string; label: string; state: 'pass' | 'fail' | 'unknown'; note?: string }
export type Verdict = { verdict: 'approved' | 'declined' | 'review'; checks: Check[]; reason?: string }

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()

async function oembed(platform: string, url: string): Promise<{ ok: true; title: string; author: string; authorId: string } | { ok: false; gone: boolean }> {
  const endpoint = platform === 'youtube' ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}` : platform === 'tiktok' ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}` : null
  if (!endpoint) return { ok: false, gone: false }
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4500), headers: { 'user-agent': 'Mozilla/5.0 (compatible; logoless-check)' } })
    if (res.status === 404 || res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, gone: true }
    if (!res.ok) return { ok: false, gone: false }
    const j = (await res.json()) as { title?: string; author_name?: string; author_url?: string; author_unique_id?: string }
    const handle = j.author_unique_id ?? (j.author_url ?? '').split('/').filter(Boolean).pop() ?? ''
    return { ok: true, title: j.title ?? '', author: j.author_name ?? '', authorId: handle.replace(/^@/, '') }
  } catch {
    return { ok: false, gone: false }
  }
}

/**
 * Looks at a submitted link the way a person would, as far as a machine can: is the video there, does its caption or title
 * name the campaign, and was it posted from an account the clipper has added. It cannot hear the audio, so a person still
 * confirms that before anything is paid. Anything unclear goes to a person. Only a link that does not lead to a video is declined.
 */
export async function checkClip(o: { platform: string; url: string; campaignTitle: string; creator: string; linked: { platform: string; url: string }[] }): Promise<Verdict> {
  const checks: Check[] = []
  const meta = await oembed(o.platform, o.url)

  if (!meta.ok) {
    if (meta.gone) {
      checks.push({ id: 'link', label: 'The video can be found', state: 'fail', note: 'The link does not lead to a public video.' })
      return { verdict: 'declined', checks, reason: 'We could not find a public video at that link. Check that the post is public, then submit it again.' }
    }
    checks.push({ id: 'link', label: 'The video can be found', state: 'unknown', note: o.platform === 'instagram' ? 'Instagram does not let us look this up automatically.' : 'We could not reach the platform just now.' })
    checks.push({ id: 'caption', label: 'The caption names the campaign', state: 'unknown' })
    return { verdict: 'review', checks }
  }

  checks.push({ id: 'link', label: 'The video can be found', state: 'pass' })

  const text = norm(`${meta.title} ${meta.author}`)
  const named = [o.campaignTitle, o.creator].map(norm).filter((x) => x.length >= 3).some((x) => text.includes(x))
  checks.push({ id: 'caption', label: 'The caption names the campaign', state: named ? 'pass' : 'fail', note: named ? undefined : `We could not see "${o.campaignTitle}" or "${o.creator}" in the title or caption.` })

  const mine = o.linked.filter((l) => l.platform === o.platform).map((l) => norm(usernameOf(l.platform, l.url)).replace(/\s/g, ''))
  const who = norm(meta.authorId).replace(/\s/g, '')
  if (mine.length && who) {
    const ok = mine.some((m) => m === who || who.includes(m) || m.includes(who))
    checks.push({ id: 'account', label: 'Posted from your account', state: ok ? 'pass' : 'fail', note: ok ? undefined : 'It looks like it came from an account that is not on your profile.' })
  } else {
    checks.push({ id: 'account', label: 'Posted from your account', state: 'unknown', note: 'Add your accounts to your profile and we can check this.' })
  }
  checks.push({ id: 'audio', label: 'Uses the campaign audio', state: 'unknown', note: 'We cannot hear it automatically. A person confirms it before you are paid.' })

  const clean = checks.filter((c) => c.id !== 'audio').every((c) => c.state === 'pass')
  return { verdict: clean ? 'approved' : 'review', checks }
}
