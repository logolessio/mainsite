'use client'

import { motion } from 'framer-motion'
import { Eye, Play } from 'lucide-react'
import { useState } from 'react'
import { TransitionLink } from '@/components/shell/transition-link'
import type { FeedClip } from '@/lib/clip-feed'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { compact, Face, PLATFORM_LABEL, PlatformIcon, Shimmer, StarsAverage } from './bits'

/**
 * One clip on the feed: the platform's picture in a phone-shaped frame, over a blurred copy of the campaign cover (so a clip without a
 * picture still looks like itself). Pointing at it lifts it and shows a play button. The clipper's name goes to their profile.
 */
export function ClipCard({ clip, onOpen, loading, appear, index }: { clip: FeedClip; onOpen: () => void; loading: boolean; appear: boolean; index: number }) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const thumb = clip.thumb && !broken ? clip.thumb : null
  const label = `${clip.title ?? `A ${PLATFORM_LABEL[clip.platform] ?? ''} clip`} for ${clip.campaign.title}, by ${clip.by.name}. ${compact(clip.views)} views. Watch.`
  return (
    <motion.li
      layout="position"
      // clips the server sent are simply there; clips that arrive while scrolling rise in, one after another
      initial={appear ? { opacity: 0, y: 24, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay: appear ? Math.min(index % 18, 10) * 0.04 : 0 }}
      className="group/clip relative"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-[calc(22px*var(--round,1))] bg-surface shadow-[0_18px_40px_-24px_rgb(0_0_0/0.95)] ring-1 ring-white/[0.07] transition-[transform,box-shadow] duration-500 group-hover/clip:-translate-y-1 group-hover/clip:shadow-[0_28px_60px_-26px_rgb(0_0_0/1)]">
        {/* the campaign cover, blurred: the clip's colours before its picture arrives */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clip.campaign.cover} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl saturate-150" />
        {!thumb && (
          <span className="absolute inset-0 grid place-items-center">
            <PlatformIcon platform={clip.platform} className="size-9 text-white/70 drop-shadow-[0_4px_18px_rgb(0_0_0/0.5)]" />
          </span>
        )}
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading={index < 6 ? 'eager' : 'lazy'}
            decoding="async"
            referrerPolicy="no-referrer"
            // a picture the browser already had can finish before the page wakes up, so it is checked on arrival too
            ref={(el) => {
              if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true)
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
            className={cn('absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 group-hover/clip:scale-[1.045]', loaded ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {loading && !thumb && <Shimmer />}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent via-35% to-black/85" />

        {/* the wrapper holds the position: on touch screens every button is made position: relative (globals.css) for a bigger tap area */}
        <div className="absolute inset-0 z-[1]">
          <button type="button" onClick={onOpen} aria-label={label} className="grid size-full place-items-center rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-inset">
            <span aria-hidden="true" className="grid size-14 scale-75 place-items-center rounded-pill bg-white/15 opacity-0 backdrop-blur-md transition-all duration-300 group-hover/clip:scale-100 group-hover/clip:opacity-100 group-focus-within/clip:opacity-100">
              <Play className="ml-0.5 size-6 fill-paper text-paper" />
            </span>
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between gap-2 p-2.5">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-black/45 px-2.5 font-mono text-[11px] text-paper backdrop-blur-md tabular-nums">
            <Eye className="size-3.5 opacity-75" />
            {compact(clip.views)}
          </span>
          <span className="grid size-7 place-items-center rounded-pill bg-black/45 backdrop-blur-md" title={PLATFORM_LABEL[clip.platform]}>
            <PlatformIcon platform={clip.platform} className="size-3.5 text-paper" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[2] p-3">
          {clip.title && <p className="pointer-events-none mb-2 line-clamp-2 text-[13px] leading-snug text-paper/90 [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">{clip.title}</p>}
          <div className="flex items-center justify-between gap-2">
            <TransitionLink href={`/@${clip.by.handle}`} className="flex min-w-0 items-center gap-2 rounded-pill py-0.5 pr-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-paper" aria-label={`${clip.by.name}'s profile`}>
              <Face src={clip.by.avatar} name={clip.by.name} size={24} />
              <span className="truncate text-[13px] font-medium text-paper">{clip.by.name}</span>
            </TransitionLink>
            {clip.rating.count > 0 && (
              <span className="pointer-events-none inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-paper/80 tabular-nums" title={`${clip.rating.avg} out of 5 from ${clip.rating.count} rating${clip.rating.count === 1 ? '' : 's'}`}>
                <StarsAverage avg={clip.rating.avg} size={10} className="hidden sm:inline-flex" />
                <span className="sm:hidden">★</span>
                {clip.rating.avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 truncate px-1 text-xs text-mute">
        <TransitionLink href={`/campaign/${clip.campaign.id}`} className="transition-colors hover:text-paper">{clip.campaign.title}</TransitionLink>
        <span aria-hidden="true"> · </span>
        {clip.campaign.creator}
      </p>
    </motion.li>
  )
}

export function ClipCardSkeleton() {
  return (
    <li aria-hidden="true">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[calc(22px*var(--round,1))] bg-white/[0.04] ring-1 ring-white/[0.05]">
        <Shimmer />
      </div>
      <div className="mt-2 h-3 w-2/3 rounded-pill bg-white/[0.05]" />
    </li>
  )
}
