'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight, FileDown, Globe, Link2, Mail, Pause, Play } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { type BioBlock, STATUS_STATES, embedFor, imgSrc, linkLabel, musicEmbed, platformOf } from '@/lib/bio'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import type { FontId } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { Typewriter } from './card'
import { type EditPart, useBio } from './context'

/** The brand marks we have a picture for (public/brands). */
const BRANDS = new Set(['android', 'apple', 'applemusic', 'artstation', 'audiomack', 'bandcamp', 'beatport', 'behance', 'bluesky', 'buymeacoffee', 'deezer', 'discord', 'dribbble', 'epicgames', 'facebook', 'github', 'google', 'instagram', 'kick', 'kofi', 'linktree', 'medium', 'patreon', 'paypal', 'pinterest', 'playstation', 'reddit', 'roblox', 'snapchat', 'soundcloud', 'spotify', 'steam', 'substack', 'telegram', 'threads', 'tidal', 'tiktok', 'tumblr', 'twitch', 'vimeo', 'whatsapp', 'x', 'youtube', 'youtubemusic', 'youtubeshorts', 'calendly', 'cashapp', 'etsy', 'figma', 'flickr', 'genius', 'gumroad', 'lastfm', 'linkedin', 'mastodon', 'notion', 'shopify', 'signal', 'venmo', 'vsco'])

export function BlockIcon({ block, className }: { block: Extract<BioBlock, { t: 'link' | 'social' }>; className?: string }) {
  const id = block.t === 'social' ? block.platform : block.icon !== 'auto' ? block.icon : /^https:\/\/buzzheavier\.com\//i.test(block.url) ? 'file' : platformOf(block.url)
  if (id === 'mail') return <Mail aria-hidden="true" className={cn('size-[1.1rem]', className)} strokeWidth={1.6} />
  if (id === 'file') return <FileDown aria-hidden="true" className={cn('size-[1.1rem]', className)} strokeWidth={1.6} />
  if (id === 'website') return <Globe aria-hidden="true" className={cn('size-[1.1rem]', className)} strokeWidth={1.6} />
  if (id && BRANDS.has(id)) return <BrandIcon name={id} className={cn('size-[1.1rem]', className)} />
  return <Link2 aria-hidden="true" className={cn('size-[1.1rem]', className)} strokeWidth={1.6} />
}

export const fontClass = (font: string) => PROFILE_FONT_CLASS[font as FontId] ?? PROFILE_FONT_CLASS.geist

/** Letters that settle one by one, from noise. */
export function Scramble({ text, className }: { text: string; className?: string }) {
  const { reduced, entered } = useBio()
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (reduced || !entered) return setOut(text)
    const chars = '█▓▒░#%&*+=<>/\\'
    let frame = 0
    const total = 28
    const id = window.setInterval(() => {
      frame++
      setOut(text.split('').map((c, i) => (c === ' ' || frame > (i / Math.max(1, text.length)) * total + 6 ? c : chars[Math.floor(Math.random() * chars.length)])).join(''))
      if (frame > total + 8) {
        window.clearInterval(id)
        setOut(text)
      }
    }, 38)
    return () => window.clearInterval(id)
  }, [text, reduced, entered])
  return <span className={className} aria-label={text}>{out}</span>
}

/** The display name, in the page's font and name style. Pass a size through className or style. */
export function Name({ className, style }: { className?: string; style?: CSSProperties }) {
  const { cfg, data } = useBio()
  const s = cfg.theme.nameStyle
  const text = data.name
  return (
    // a div with the heading role, not an h1: the site's own heading rules (capitals, a hard shadow) must not reach a person's page
    <div role="heading" aria-level={1} data-in style={{ '--i': 1, ...style } as CSSProperties} className={cn('bn bio-zoom-name', fontClass(cfg.theme.font), s !== 'scramble' && s !== 'solid' && `bn-${s}`, className)} data-text={text}>
      {s === 'scramble' ? <Scramble text={text} /> : text}
    </div>
  )
}

export function Bio({ className, center = false }: { className?: string; center?: boolean }) {
  const { data, cfg } = useBio()
  if (!data.bio) return null
  const cls = cn('bio-zoom-bio bio-mute max-w-[34rem] text-[1rem] leading-relaxed whitespace-pre-line', fontClass(cfg.theme.font), center && 'mx-auto', className)
  if (cfg.fx.typewriter) return <Typewriter text={data.bio} className={cls} />
  return (
    <p data-in style={{ '--i': 2 } as CSSProperties} className={cls}>
      {data.bio}
    </p>
  )
}

export function Avatar({ size, className }: { size?: number; className?: string }) {
  const { cfg, data, reduced, level } = useBio()
  const px = Math.round(((size ?? 120) * cfg.avatar.size) / 100)
  const halo = useTransform(level, (v) => 1 + v * 0.34)
  const haloOp = useTransform(level, (v) => Math.min(0.9, v * 1.5))
  return (
    <div data-in style={{ '--i': 0 } as CSSProperties} className={className}>
      <div className="relative" style={{ animation: cfg.avatar.float && !reduced ? 'bio-float 6s ease-in-out infinite' : undefined }}>
        {cfg.audio.id && cfg.audio.reactive && (
          <>
            <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 border border-[var(--bio-fg)]" style={{ scale: halo, opacity: haloOp, borderRadius: cfg.avatar.shape === 'circle' ? '999px' : cfg.avatar.shape === 'rounded' ? '28%' : '0' }} />
          </>
        )}
        <div className="ba" data-shape={cfg.avatar.shape} data-ring={cfg.avatar.ring ? 1 : 0} data-gray={cfg.avatar.gray ? 1 : 0} style={{ width: px, height: cfg.avatar.shape === 'arch' ? Math.round(px * 1.25) : px }}>
          {cfg.avatar.url || data.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cfg.avatar.url || data.avatar || ''} alt={data.name} width={px} height={px} draggable={false} referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-full place-items-center text-[2.2rem] font-medium">{data.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function Socials({ className, justify = 'center' }: { className?: string; justify?: 'center' | 'start' }) {
  const { socials, track, mode, cfg } = useBio()
  if (!socials.length) return null
  const look = cfg.theme.icons
  return (
    <ul data-in style={{ '--i': 3 } as CSSProperties} className={cn('flex flex-wrap', look === 'boxed' ? 'gap-2.5' : 'gap-1.5', justify === 'center' ? 'justify-center' : 'justify-start', className)}>
      {socials.map((s) => (
        <li key={s.id}>
          <a className="bs" data-icons={look} href={s.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={s.platform} onClick={() => track('click', s.id)} tabIndex={mode === 'mini' ? -1 : undefined}>
            <BlockIcon block={s} className={look === 'boxed' ? 'size-[1.15rem]' : 'size-[1.55rem]'} />
          </a>
        </li>
      ))}
    </ul>
  )
}

/** In the editor's preview, a part of the page you can click to open its settings (it is outlined under the pointer). On the real page it is just a box. */
export function Part({ id, className, children }: { id: EditPart; className?: string; children: ReactNode }) {
  const { onPart } = useBio()
  if (!onPart) return <div className={className}>{children}</div>
  return (
    <div
      data-part={id}
      className={cn('bio-part', className)}
      onClickCapture={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onPart(id)
      }}
    >
      {children}
    </div>
  )
}

/** A click on the empty background of the page, in the editor's preview, opens the background's settings. */
export function useBackgroundClick() {
  const { onPart } = useBio()
  return (e: React.MouseEvent) => {
    if (onPart && e.target === e.currentTarget) onPart('background')
  }
}

/** Leans towards the pointer (a few degrees) and follows it a little: the soft 3D feel of a card or button. */
export function Lean({ children, className, max = 7, pull = 6, style }: { children: ReactNode; className?: string; max?: number; pull?: number; style?: CSSProperties }) {
  const { cfg, reduced, mode } = useBio()
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const spring = { stiffness: 220, damping: 22, mass: 0.4 }
  const srx = useSpring(rx, spring)
  const sry = useSpring(ry, spring)
  const smx = useSpring(mx, spring)
  const smy = useSpring(my, spring)
  const on = (cfg.fx.tilt || cfg.fx.magnetic) && !reduced && mode !== 'mini'
  const move = (e: React.PointerEvent) => {
    if (!on || e.pointerType !== 'mouse') return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const nx = (e.clientX - r.left) / r.width - 0.5
    const ny = (e.clientY - r.top) / r.height - 0.5
    if (cfg.fx.tilt) {
      ry.set(nx * max)
      rx.set(-ny * max)
    }
    if (cfg.fx.magnetic) {
      mx.set(nx * pull)
      my.set(ny * pull)
    }
  }
  const leave = () => {
    rx.set(0)
    ry.set(0)
    mx.set(0)
    my.set(0)
  }
  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} className={className} style={{ ...style, rotateX: srx, rotateY: sry, x: smx, y: smy, transformPerspective: 900 }}>
      {children}
    </motion.div>
  )
}

/** One link: the icon, the title (and a line under it), an arrow. It counts a press and then does what a link does. */
export function LinkItem({ block, index = 0, className }: { block: Extract<BioBlock, { t: 'link' }>; index?: number; className?: string }) {
  const { track, mode } = useBio()
  const external = !block.url.startsWith('mailto:')
  return (
    <Lean>
      <a
        data-in
        data-link
        data-anim={block.anim && block.anim !== 'none' ? block.anim : undefined}
        data-feat={block.featured ? 1 : undefined}
        style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties}
        className={cn('bl', className)}
        href={mode === 'live' || mode === 'preview' ? block.url : undefined}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer nofollow' : undefined}
        onClick={(e) => {
          if (mode === 'mini') return e.preventDefault()
          track('click', block.id)
          if (mode === 'preview') e.preventDefault() // the editor's copy does not leave the editor
        }}
        tabIndex={mode === 'mini' ? -1 : undefined}
      >
        <span className="bl-ico">
          <BlockIcon block={block} className="size-[1.25rem]" />
        </span>
        <span className="bl-title">
          {linkLabel(block)}
          {block.note && <span className="bl-note">{block.note}</span>}
        </span>
        <ArrowUpRight aria-hidden="true" className="bl-arrow size-[1.05rem]" strokeWidth={1.6} />
      </a>
    </Lean>
  )
}

export function VideoBlock({ block, index = 0 }: { block: Extract<BioBlock, { t: 'video' }>; index?: number }) {
  const { mode } = useBio()
  const embed = embedFor(block.url)
  if (!embed) return <LinkItem block={{ id: block.id, t: 'link', title: block.title || block.url, url: block.url, icon: 'auto', note: '', hidden: false, pin: false }} index={index} />
  const tall = embed.ratio < 1
  return (
    <div data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className="w-full overflow-hidden" >
      <div className="relative mx-auto w-full overflow-hidden border border-[var(--bio-line)] bg-[var(--bio-soft)]" style={{ aspectRatio: String(embed.ratio), maxWidth: tall ? '20rem' : undefined, borderRadius: 'var(--bio-r)' }}>
        {mode === 'mini' ? (
          <div className="absolute inset-0 grid place-items-center text-[var(--bio-mute)]">
            <span className="size-10 rounded-full border border-[var(--bio-line)]" />
          </div>
        ) : (
          <iframe src={embed.src} title={block.title || 'Video'} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full border-0" />
        )}
      </div>
      {block.title && <p className="bio-mute mt-2 text-center text-[0.82rem]">{block.title}</p>}
    </div>
  )
}

export function Heading({ text, index = 0 }: { text: string; index?: number }) {
  const { cfg } = useBio()
  return (
    <div role="heading" aria-level={2} data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className={cn('bio-mute pt-3 text-[0.78rem] font-medium tracking-[0.18em] uppercase', fontClass(cfg.theme.font), cfg.theme.align === 'center' ? 'text-center' : 'text-left')}>
      {text}
    </div>
  )
}

export function TextBlock({ text, index = 0 }: { text: string; index?: number }) {
  const { cfg } = useBio()
  return (
    <p data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className={cn('bio-mute whitespace-pre-line text-[0.95rem] leading-relaxed', fontClass(cfg.theme.font), cfg.theme.align === 'center' ? 'text-center' : 'text-left')}>
      {text}
    </p>
  )
}

export const Divider = () => <hr data-in className="my-2 border-0 border-t border-[var(--bio-line)]" />

const clock = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`

/**
 * A song as a card: the cover, the title and the artist, a play button, and how far it has got (press the bar to jump). It plays a file or a clip right on
 * the page; for a song that lives on Spotify or the like it opens that service's player under the card instead.
 */
function TrackCard({ block, embed, audio, index = 0 }: { block: Extract<BioBlock, { t: 'music' }>; embed: ReturnType<typeof musicEmbed>; audio: string; index?: number }) {
  const { mode } = useBio()
  const el = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [at, setAt] = useState(0)
  const [len, setLen] = useState(0)
  const [open, setOpen] = useState(false)
  const line = [block.artist, block.album].filter(Boolean).join(' · ')
  const press = () => {
    if (audio) {
      const a = el.current
      if (!a) return
      if (a.paused) void a.play().catch(() => null)
      else a.pause()
    } else setOpen((v) => !v)
  }
  return (
    <div data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className="w-full">
      <div className="bl !cursor-default gap-3.5 py-3">
        {audio && <audio ref={el} src={mode === 'mini' ? undefined : audio} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setLen(e.currentTarget.duration || 0)} />}
        <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden bg-[var(--bio-soft)]" style={{ borderRadius: 'calc(var(--bio-r) * 0.55)' }}>
          {block.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mode === 'mini' && !block.cover.startsWith('https:') ? undefined : imgSrc(block.cover)} alt="" draggable={false} referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : (
            <Play className="size-5 opacity-60" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="bl-title block truncate">{block.title || 'Listen'}</span>
          {line && <span className="bio-mute block truncate text-[0.78rem]">{line}</span>}
          {audio && (
            <span
              role="slider"
              tabIndex={0}
              aria-label="Position in the song"
              aria-valuemin={0}
              aria-valuemax={Math.round(len)}
              aria-valuenow={Math.round(at)}
              onClick={(e) => {
                const a = el.current
                if (!a || !len) return
                const r = e.currentTarget.getBoundingClientRect()
                a.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * len
              }}
              onKeyDown={(e) => {
                const a = el.current
                if (!a) return
                if (e.key === 'ArrowRight') a.currentTime += 5
                if (e.key === 'ArrowLeft') a.currentTime -= 5
              }}
              className="mt-2 block h-1.5 cursor-pointer overflow-hidden rounded-full bg-[rgb(var(--bio-fg-rgb)/0.18)]"
            >
              <span className="block h-full rounded-full bg-[var(--bio-fg)]" style={{ width: `${len ? (at / len) * 100 : 0}%` }} />
            </span>
          )}
        </span>
        {audio && len > 0 && <span className="bio-mute shrink-0 text-[0.7rem] tabular-nums">{clock(at)}</span>}
        <button type="button" aria-label={playing || open ? 'Pause' : 'Play'} onClick={press} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[var(--bio-fg)] text-[var(--bio-bg)] transition-transform duration-200 hover:scale-105">
          {playing || open ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
        </button>
      </div>
      {!audio && open && embed && embed.src && mode !== 'mini' && (
        <div className="mt-2 overflow-hidden border border-[var(--bio-line)]" style={{ borderRadius: 'var(--bio-r)', height: embed.height || undefined, aspectRatio: embed.height ? undefined : String(embed.ratio ?? 16 / 9) }}>
          <iframe src={embed.src} title={block.title || 'Music'} allow="autoplay; encrypted-media; clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" className="size-full border-0" />
        </div>
      )}
    </div>
  )
}

/**
 * A song. With details (a cover, an artist) or as a file, an upload or a clip it is a card on the page's own style; a streaming link on its own, or one set to
 * show the full player, is shown in that service's player.
 */
export function MusicBlock({ block, index = 0 }: { block: Extract<BioBlock, { t: 'music' }>; index?: number }) {
  const { mode } = useBio()
  const m = musicEmbed(block.url)
  const details = Boolean(block.cover || block.artist || block.preview)
  if (!m && !details) return <LinkItem block={{ id: block.id, t: 'link', title: block.title || block.url, url: block.url, icon: 'auto', note: '', hidden: false, pin: false }} index={index} />
  const audio = block.preview || (m && (m.kind === 'file' || m.kind === 'upload') ? m.src : '')
  if (!block.player && (audio || details)) return <TrackCard block={block} embed={m} audio={audio} index={index} />
  if (!m || m.kind === 'file' || m.kind === 'upload') return <TrackCard block={block} embed={m} audio={audio} index={index} />
  return (
    <div data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className="w-full overflow-hidden">
      <div className="relative w-full overflow-hidden border border-[var(--bio-line)] bg-[var(--bio-soft)]" style={{ borderRadius: 'var(--bio-r)', height: m.height || undefined, aspectRatio: m.height ? undefined : String(m.ratio ?? 16 / 9) }}>
        {mode === 'mini' ? (
          <div className="absolute inset-0 grid place-items-center text-[var(--bio-mute)]">
            <Play className="size-6" />
          </div>
        ) : (
          <iframe src={m.src} title={block.title || 'Music'} loading="lazy" allow="autoplay; encrypted-media; clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full border-0" />
        )}
      </div>
      {block.title && <p className="bio-mute mt-2 text-center text-[0.82rem]">{block.title}</p>}
    </div>
  )
}

/** A picture (or GIF) on the page, in the shape asked for, linking somewhere if it was given a link. */
export function ImageBlock({ block, index = 0 }: { block: Extract<BioBlock, { t: 'image' }>; index?: number }) {
  const { track, mode } = useBio()
  const ratio = block.shape === 'wide' ? '16 / 9' : block.shape === 'square' ? '1 / 1' : block.shape === 'tall' ? '4 / 5' : undefined
  const pic = (
    <div className="overflow-hidden border border-[var(--bio-line)]" style={{ aspectRatio: ratio, borderRadius: 'var(--bio-r)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mode === 'mini' && !block.src.startsWith('https:') ? undefined : imgSrc(block.src)} alt={block.title} loading="lazy" draggable={false} referrerPolicy="no-referrer" className={cn('block w-full', ratio && 'size-full object-cover')} />
    </div>
  )
  return (
    <figure data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className="w-full">
      {block.url ? (
        <a
          href={mode === 'live' ? block.url : undefined}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={(e) => {
            if (mode !== 'live') return e.preventDefault()
            track('click', block.id)
          }}
          className="block transition-transform duration-300 hover:-translate-y-0.5"
          tabIndex={mode === 'mini' ? -1 : undefined}
        >
          {pic}
        </a>
      ) : (
        pic
      )}
      {block.title && <figcaption className="bio-mute mt-2 text-center text-[0.82rem]">{block.title}</figcaption>}
    </figure>
  )
}

/** A row of small labels: what you do, what you use, where you are. */
export function TagsBlock({ block, index = 0 }: { block: Extract<BioBlock, { t: 'tags' }>; index?: number }) {
  const { cfg } = useBio()
  return (
    <ul data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className={cn('flex flex-wrap gap-2', cfg.theme.align === 'center' ? 'justify-center' : 'justify-start', fontClass(cfg.theme.font))}>
      {block.items.map((t) => (
        <li
          key={t}
          className={cn(
            'inline-flex h-7 items-center text-[0.76rem] whitespace-nowrap',
            block.style === 'pill' && 'rounded-full border border-[var(--bio-line)] bg-[var(--bio-soft)] px-3',
            block.style === 'outline' && 'rounded-full border border-[rgb(var(--bio-accent-rgb)/0.55)] px-3',
            block.style === 'hash' && 'bio-mute px-0.5',
          )}
        >
          {block.style === 'hash' ? `#${t}` : t}
        </li>
      ))}
    </ul>
  )
}

/** A line with a coloured dot: open for work, busy until May, away. */
export function StatusBlock({ block, index = 0 }: { block: Extract<BioBlock, { t: 'status' }>; index?: number }) {
  const { cfg } = useBio()
  const dot = STATUS_STATES.find((s) => s.id === block.state)?.dot ?? '#3ddc84'
  return (
    <div data-in style={{ '--i': 4 + Math.min(index, 12) } as CSSProperties} className={cn('flex', cfg.theme.align === 'center' ? 'justify-center' : 'justify-start')}>
      <span className={cn('inline-flex h-8 items-center gap-2.5 rounded-full border border-[var(--bio-line)] bg-[var(--bio-soft)] px-3.5 text-[0.8rem]', fontClass(cfg.theme.font))}>
        <span className="relative grid size-2.5 place-items-center">
          {block.state === 'open' && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: dot }} />}
          <span className="relative size-2 rounded-full" style={{ background: dot }} />
        </span>
        {block.text}
      </span>
    </div>
  )
}

/** Any block, in the page's own style. `plain` leaves out headings and text (for layouts that only want the links). */
export function BlockView({ block, index }: { block: BioBlock; index: number }) {
  switch (block.t) {
    case 'link':
      return <LinkItem block={block} index={index} />
    case 'video':
      return <VideoBlock block={block} index={index} />
    case 'heading':
      return <Heading text={block.text} index={index} />
    case 'text':
      return <TextBlock text={block.text} index={index} />
    case 'music':
      return <MusicBlock block={block} index={index} />
    case 'image':
      return <ImageBlock block={block} index={index} />
    case 'tags':
      return <TagsBlock block={block} index={index} />
    case 'status':
      return <StatusBlock block={block} index={index} />
    case 'divider':
      return <Divider />
    default:
      return null
  }
}

/** The links (and the rest) one under the other, with a steady gap. */
export function BlockList({ className, items }: { className?: string; items?: BioBlock[] }) {
  const { items: all, cfg } = useBio()
  const list = items ?? all
  const grid = cfg.theme.links === 'grid'
  return (
    <div className={cn('w-full', grid ? 'grid grid-cols-2' : 'flex flex-col', className)} style={{ gap: 'calc(0.75rem * var(--bio-gap-k, 1))' }}>
      {list.map((b, i) => (grid && b.t !== 'link' ? <div key={b.id} className="col-span-2"><BlockView block={b} index={i} /></div> : <BlockView key={b.id} block={b} index={i} />))}
    </div>
  )
}
