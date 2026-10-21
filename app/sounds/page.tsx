import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { SoundBoard, type SoundItem } from '@/components/extras/sound-board'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { getExtras } from '@/lib/campaign-extras'
import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Sound board | logoless', description: 'Every official sound for every live campaign, in one place. Listen, then use it.' }

const brandOf = (u: string): SoundItem['links'][number]['brand'] => (/tiktok\.com/.test(u) ? 'tiktok' : /instagram\.com/.test(u) ? 'instagram' : /youtu/.test(u) ? 'youtube' : /spotify/.test(u) ? 'spotify' : null)
const labelOf = (u: string) => (/tiktok\.com/.test(u) ? 'Use on TikTok' : /instagram\.com/.test(u) ? 'Use on Instagram' : /youtu/.test(u) ? 'Open on YouTube' : /spotify/.test(u) ? 'Spotify' : /soundcloud/.test(u) ? 'SoundCloud' : /apple\.com/.test(u) ? 'Apple Music' : 'Open')

export default async function Page() {
  await connection()
  if (!(await featureOn('sound-board'))) notFound()
  const live = await liveCampaigns()
  const items: SoundItem[] = (
    await Promise.all(
      live.map(async (c) => {
        const x = await getExtras(c.id)
        const links = [...x.sounds, ...x.spotify].map((url) => ({ url, label: labelOf(url), brand: brandOf(url) }))
        const preview = x.audio ? `/api/audio/${x.audio}` : c.previewUrl && !c.previewUrl.startsWith('/previews/') ? c.previewUrl : null
        return links.length || preview ? { id: c.id, title: c.title, creator: c.creator, cover: c.cover, rate: c.ratePer1k, preview, links } : null
      }),
    )
  ).filter((x): x is SoundItem => x !== null)
  return (
    <main className={`${CONTAINER} pt-24 pb-32`}>
      <Breadcrumbs trail={[{ name: 'Sound board' }]} />
      <h1 className="mt-8 font-display text-5xl tracking-[-0.03em] md:text-7xl">Sound board</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">Every official sound for every live campaign. Listen, then use it in your clip.</p>
      <div className="mt-10">
        {items.length ? <SoundBoard items={items} /> : <p className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center text-mute">No live campaign has shared its sound yet. Check back soon.</p>}
      </div>
    </main>
  )
}
