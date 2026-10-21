'use client'

import { ExternalLink, Pause, Play } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { usePreview } from '@/components/shell/preview-provider'
import { TransitionLink } from '@/components/shell/transition-link'

export type SoundItem = { id: string; title: string; creator: string; cover: string; rate: number; preview: string | null; links: { label: string; url: string; brand: 'tiktok' | 'instagram' | 'youtube' | 'spotify' | null }[] }

/** Every official sound in one list: press play to hear it, one tap to the sound on the platform, one to the campaign. */
export function SoundBoard({ items }: { items: SoundItem[] }) {
  const { playingId, toggle } = usePreview()
  return (
    <ul className="grid gap-3">
      {items.map((s) => {
        const playing = playingId === s.id
        return (
          <li key={s.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-card border border-line bg-white/[0.02] p-4 sm:flex-nowrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.cover} alt="" className="size-16 shrink-0 rounded-panel object-cover" />
            <div className="min-w-0 flex-1 basis-56">
              <p className="truncate text-lg leading-tight">{s.title}</p>
              <p className="truncate text-sm text-mute">
                {s.creator} · ${s.rate.toFixed(2)} per 1,000 views
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.preview && (
                <button type="button" onClick={() => toggle(s.id, s.preview as string)} aria-pressed={playing} aria-label={`${playing ? 'Pause' : 'Play'} ${s.title}`} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />} {playing ? 'Pause' : 'Listen'}
                </button>
              )}
              {s.links.slice(0, 2).map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
                  {l.brand && <BrandIcon name={l.brand} className="size-4" />} {l.label} <ExternalLink aria-hidden="true" className="size-3 text-mute" />
                </a>
              ))}
              <TransitionLink href={`/campaign/${s.id}`} className="inline-flex h-10 items-center rounded-pill px-3 text-sm text-mute transition-colors hover:text-paper">
                Campaign
              </TransitionLink>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
