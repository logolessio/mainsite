import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { CreatorCard } from '@/components/extras/creator-card'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { getSession } from '@/lib/session'
import { directory } from '@/lib/showcase'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Find creators | logoless', description: 'Creators who show their pages: what they have earned views on, where they post, and how reliable their clips are.' }

const SORTS = [
  { id: 'views', label: 'Most views' },
  { id: 'trusted', label: 'Most trusted' },
  { id: 'new', label: 'Newest' },
] as const
const PLATFORMS = [
  { id: '', label: 'Anywhere' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
]

/** A directory of creators who have a public page and an approved clip. Brands with a live campaign can invite them to it. */
export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string; s?: string; q?: string }> }) {
  await connection()
  if (!(await featureOn('creator-directory'))) notFound()
  const sp = await searchParams
  const sort = SORTS.find((x) => x.id === sp.s)?.id ?? 'views'
  const platform = PLATFORMS.find((x) => x.id === sp.p)?.id ?? ''
  const q = (sp.q ?? '').slice(0, 40)
  const trustedOn = await featureOn('trusted-creator')
  const list = (await directory({ platform: platform || null, sort, q })).map((c) => (trustedOn ? c : { ...c, trusted: false }))
  // a brand with live campaigns sees an Invite button on each card
  let mine: { id: string; title: string }[] = []
  if ((await featureOn('creator-invites')) && (await getSession())?.user?.email) {
    const s = await getSession()
    const d = await db()
    mine = (await d.prepare("SELECT c.id, c.title FROM campaigns c JOIN users u ON u.id = c.brand_user_id WHERE u.email = ?1 AND c.status = 'live' ORDER BY c.created_at DESC LIMIT 20").bind((s?.user?.email ?? '').toLowerCase()).all<{ id: string; title: string }>()).results
  }
  const href = (o: Partial<{ p: string; s: string; q: string }>) => {
    const u = new URLSearchParams({ ...(platform && { p: platform }), s: sort, ...(q && { q }), ...o } as Record<string, string>)
    return `/creators?${u.toString()}`
  }
  return (
    <main className={`${CONTAINER} pt-24 pb-32`}>
      <Breadcrumbs trail={[{ name: 'Creators' }]} />
      <h1 className="mt-8 font-display text-5xl tracking-[-0.03em] md:text-7xl">Find creators</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">People with a public page and clips that were approved. They decide what is shown here: nothing appears that is not on their own page.</p>
      <form action="/creators" className="mt-8 flex flex-wrap items-center gap-2">
        <input type="hidden" name="s" value={sort} />
        {platform && <input type="hidden" name="p" value={platform} />}
        <input name="q" defaultValue={q} placeholder="Search by name" aria-label="Search creators by name" className="h-11 w-full max-w-xs rounded-pill border border-line-strong bg-transparent px-5 text-[15px] outline-none placeholder:text-mute focus:border-paper/60" />
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((o) => (
            <a key={o.id} href={href({ p: o.id })} className={cn('inline-flex h-11 items-center rounded-pill border px-4 text-sm transition-colors', platform === o.id ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
              {o.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex gap-1 rounded-pill border border-line p-1">
          {SORTS.map((o) => (
            <a key={o.id} href={href({ s: o.id })} className={cn('inline-flex h-9 items-center rounded-pill px-3.5 text-sm transition-colors', sort === o.id ? 'bg-white/[0.12] text-paper' : 'text-mute hover:text-paper')}>
              {o.label}
            </a>
          ))}
        </div>
      </form>
      {list.length ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <CreatorCard key={c.userId} c={c} campaigns={mine} />
          ))}
        </ul>
      ) : (
        <p className="mt-12 rounded-card border border-dashed border-line-strong px-6 py-16 text-center text-mute">No creators match. Try another platform or clear the search.</p>
      )}
    </main>
  )
}
