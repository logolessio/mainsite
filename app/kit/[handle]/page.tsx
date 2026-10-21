import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { LINK_PLATFORMS, usernameOf } from '@/lib/profile-style'
import { publicCreator, topClipsOf } from '@/lib/showcase'

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const c = (await featureOn('media-kit')) ? await publicCreator((await params).handle) : null
  return c ? { title: `${c.name}: media kit | logoless`, description: `Verified numbers and best clips from ${c.name} on logoless.` } : { title: 'Media kit | logoless', robots: { index: false } }
}

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

/** A creator's media kit: the numbers they show, where they post, their best clips. Made from their profile, so it is always up to date, and it shows nothing they have hidden. */
export default async function Page({ params }: Props) {
  await connection()
  if (!(await featureOn('media-kit'))) notFound()
  const found = await publicCreator((await params).handle)
  if (!found) notFound()
  const c = (await featureOn('trusted-creator')) ? found : { ...found, trusted: false }
  const clips = c.view.show.clips || c.view.show.views ? await topClipsOf(c.userId) : []
  const hidden = c.view.extras.privacy.hiddenLinks
  const links = c.view.show.links ? c.view.links.filter((l) => ['tiktok', 'youtube', 'instagram'].includes(l.platform) && !hidden.includes(l.platform)) : []
  const stats = [c.views !== null && ['Verified views', compact(c.views)], c.clips !== null && ['Approved clips', String(c.clips)], c.earnedCents !== null && ['Earned on logoless', usd(c.earnedCents)]].filter(Boolean) as [string, string][]
  return (
    <main className={`${CONTAINER} pt-24 pb-32 print:pt-6`}>
      <Breadcrumbs trail={[{ name: 'Creators', href: '/creators' }, { name: c.name }]} />
      <div className="mt-10 flex flex-wrap items-center gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.avatar} alt="" className="size-24 rounded-pill object-cover" />
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-tight tracking-[-0.03em] md:text-6xl">{c.name}</h1>
          <p className="mt-1 text-mute">
            logoless.io/@{c.handle}
            {c.trusted ? ' · Trusted' : ''}
          </p>
        </div>
      </div>
      {c.bio && <p className="mt-8 max-w-2xl text-lg leading-relaxed text-paper/80">{c.bio}</p>}
      {stats.length > 0 && (
        <dl className="mt-10 grid gap-x-10 gap-y-8 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-mute">{k}</dt>
              <dd className="mt-2 font-display text-5xl leading-none tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {links.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-line pb-3 font-display text-2xl">Where they post</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {links.map((l) => (
              <li key={l.platform}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-pill border border-line-strong px-5 text-sm transition-colors hover:bg-white/[0.06]">
                  <BrandIcon name={l.platform as BrandName} className="size-4" /> {LINK_PLATFORMS.find((p) => p.id === l.platform)?.label} · @{usernameOf(l.platform, l.url).replace(/^https?:\/\/[^/]+\/@?/, '')}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {clips.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-line pb-3 font-display text-2xl">Best clips</h2>
          <ul>
            {clips.map((k) => (
              <li key={k.id} className="border-b border-line">
                <a href={k.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02]">
                  <span className="min-w-0 flex-1 truncate text-[17px]">{k.campaign}</span>
                  <span className="text-sm text-mute capitalize">{k.platform}</span>
                  <span className="w-24 text-right text-sm text-mute tabular-nums">{compact(k.views)} views</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-12 max-w-xl text-xs leading-relaxed text-mute">Numbers are verified by logoless from the platforms. This page is made from the creator&apos;s own profile and shows only what they chose to show.</p>
    </main>
  )
}
