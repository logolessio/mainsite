'use client'

import { ExternalLink, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type PreviewItem = { id: string; title: string; note: string; href: string }
const SIZES = [
  { id: 'desktop', label: 'Desktop', w: 1280, h: 800, icon: Monitor },
  { id: 'tablet', label: 'Tablet', w: 820, h: 1100, icon: Tablet },
  { id: 'phone', label: 'Phone', w: 390, h: 800, icon: Smartphone },
] as const

/** Every dashboard, live, in a frame. Pick a screen size; open any one in full. */
export function DashboardPreview({ items }: { items: PreviewItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')
  const [size, setSize] = useState<(typeof SIZES)[number]['id']>('desktop')
  const item = items.find((i) => i.id === active) ?? items[0]
  const s = SIZES.find((x) => x.id === size) ?? SIZES[0]
  const scale = size === 'phone' ? 0.8 : size === 'tablet' ? 0.62 : 0.62
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full border border-line p-1" role="tablist" aria-label="Dashboard">
          {items.map((i) => (
            <button key={i.id} role="tab" type="button" aria-selected={active === i.id} onClick={() => setActive(i.id)} className={cn('h-9 rounded-full px-4 text-sm transition-colors', active === i.id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
              {i.title}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-line p-1" role="group" aria-label="Screen size">
          {SIZES.map((x) => (
            <button key={x.id} type="button" aria-pressed={size === x.id} aria-label={x.label} onClick={() => setSize(x.id)} className={cn('grid size-9 place-items-center rounded-full transition-colors', size === x.id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
              <x.icon className="size-4" />
            </button>
          ))}
        </div>
        {item && (
          <a href={item.href} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm hover:bg-paper/10">
            Open in full <ExternalLink className="size-4" />
          </a>
        )}
      </div>
      {item && <p className="mt-3 text-sm text-mute">{item.note}</p>}
      <div className="mt-5 overflow-auto rounded-[1.6rem] border border-line bg-black/40 p-4">
        <div style={{ width: s.w * scale, height: s.h * scale }} className="mx-auto">
          {item && (
            <iframe
              key={`${item.id}-${size}`}
              src={item.href}
              title={`${item.title} preview`}
              style={{ width: s.w, height: s.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
              className="rounded-2xl border border-line-strong bg-ink"
            />
          )}
        </div>
      </div>
    </div>
  )
}
