'use client'

import { Eye, MapPin } from 'lucide-react'
import { useBio } from './context'

/** The small line along the bottom of a page: the view count and where you are on the left, "logoless" on the right. */
export function Corner() {
  const { data, cfg, mode } = useBio()
  if (mode === 'mini') return null
  const views = data.views
  const where = cfg.meta.location
  const mark = cfg.meta.badge
  if (views === null && !where && !mark) return null
  return (
    <div className="bio-mute pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 px-5 py-3.5 text-[0.74rem]">
      <span className="flex min-w-0 items-center gap-2.5">
        {views !== null && (
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" strokeWidth={1.8} />
            {views.toLocaleString('en-US')}
          </span>
        )}
        {views !== null && where && <span aria-hidden="true" className="h-3 w-px bg-current opacity-40" />}
        {where && (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{where}</span>
          </span>
        )}
      </span>
      {mark && (
        <a href={mode === 'live' ? '/' : undefined} className="pointer-events-auto underline-offset-4 hover:underline">
          logoless
        </a>
      )}
    </div>
  )
}
