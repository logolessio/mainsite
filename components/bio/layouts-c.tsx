'use client'

import type { CSSProperties } from 'react'
import { imgSrc, mediaKindOf } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockList, Name, Part, Socials, useBackgroundClick } from './bits'
import { Badges } from './card'
import { useBio } from './context'
import { Layer, Stage } from './stage'

/** Everything that holds the page in the middle of the screen. */
function Frame({ children }: { children: React.ReactNode }) {
  const bg = useBackgroundClick()
  return (
    <main onClick={bg} className="grid min-h-full w-full place-items-center px-4 pt-10 pb-16 md:pt-14">
      {children}
    </main>
  )
}

/** The title, with its badges under it. */
function Title({ align = 'center' }: { align?: 'center' | 'left' }) {
  return (
    <>
      <Part id="profile" className="mt-5">
        <Name className="text-[clamp(1.7rem,7cqw,2.3rem)] leading-[1.1] font-semibold [overflow-wrap:anywhere]" style={{ textAlign: align }} />
      </Part>
      <Badges center={align === 'center'} className="mt-2.5" />
    </>
  )
}

/** Classic: the picture, name, badges, bio and icons down the middle of a floating card, and the links under them. */
export function Classic() {
  const { socials, items } = useBio()
  return (
    <Frame>
      <Stage>
        <div className="flex flex-col items-center px-7 pt-10 pb-8 text-center">
          <Layer z={56}>
            <Part id="profile">
              <Avatar size={116} />
            </Part>
          </Layer>
          <Layer z={38}>
            <Title />
          </Layer>
          <Layer z={22} className="mt-3 w-full">
            <Part id="profile">
              <Bio className="mx-auto !max-w-[28rem] text-[0.95rem]" center />
            </Part>
          </Layer>
          {socials.length > 0 && (
            <Layer z={34} className="mt-5">
              <Part id="links">
                <Socials />
              </Part>
            </Layer>
          )}
          {items.length > 0 && (
            <Layer z={16} className="mt-6 w-full">
              <Part id="links" className="w-full">
                <BlockList />
              </Part>
            </Layer>
          )}
        </div>
      </Stage>
    </Frame>
  )
}

/** Card: the profile card from the old logoless: a banner, the picture over its lower edge, then an "about me" panel that holds the bio, the accounts and the links. */
export function Card() {
  const { data, cfg, items, socials, mode } = useBio()
  const custom = cfg.colors.on
  const banner = cfg.card.banner
  const bannerVideo = banner && mediaKindOf(banner) === 'video'
  const bannerStyle: CSSProperties = banner && !bannerVideo
    ? { background: `center / cover no-repeat url(${imgSrc(banner)})` }
    : custom
      ? { background: 'linear-gradient(135deg, var(--bio-accent), var(--bio-accent2))' }
      : { background: 'linear-gradient(135deg, rgb(var(--bio-fg-rgb) / 0.28), rgb(var(--bio-fg-rgb) / 0.07))' }
  const circle = cfg.avatar.shape === 'circle'
  return (
    <Frame>
      <Stage className="overflow-visible">
        <Part id="card" className="overflow-hidden" >
          <div className="relative h-[8.25rem] overflow-hidden" style={{ ...bannerStyle, borderRadius: 'calc(var(--bio-r) + 8px) calc(var(--bio-r) + 8px) 0 0' }}>
            {bannerVideo && mode !== 'mini' && <video src={imgSrc(banner)} muted loop playsInline autoPlay preload="metadata" className="absolute inset-0 size-full object-cover" />}
            <span aria-hidden="true" className="card-sheen absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
          </div>
        </Part>
        <div className="relative px-5 pb-5">
          <Layer z={52} className="-mt-[3.5rem] mb-3 inline-block">
            <div className={cn('inline-block bg-[var(--bio-bg)] p-[5px]', circle ? 'rounded-full' : 'rounded-[1.4rem]')}>
              <Part id="profile">
                <Avatar size={96} />
              </Part>
            </div>
          </Layer>
          <Layer z={34} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Part id="profile">
              <Name className="min-w-0 text-[clamp(1.6rem,7cqw,2.1rem)] leading-tight font-semibold [overflow-wrap:anywhere]" style={{ textAlign: 'left' }} />
            </Part>
            <Badges center={false} className="min-w-0" />
          </Layer>
          <p className="bio-mute mt-1 text-[0.82rem]">logoless.io/{data.handle}</p>
          <Layer z={22} className="mt-5 grid gap-5 rounded-[calc(var(--bio-r)+4px)] border border-[var(--bio-line)] bg-[rgb(var(--bio-fg-rgb)/0.06)] p-4">
            {data.bio && (
              <Part id="profile">
                <h2 className="bio-mute mb-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase">About me</h2>
                <Bio className="!max-w-none text-[0.92rem]" />
              </Part>
            )}
            {socials.length > 0 && (
              <Part id="links">
                <h2 className="bio-mute mb-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase">Find me on</h2>
                <Socials justify="start" />
              </Part>
            )}
            {items.length > 0 && (
              <Part id="links">
                <h2 className="bio-mute mb-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase">Links</h2>
                <BlockList />
              </Part>
            )}
            {!data.bio && !socials.length && !items.length && <p className="bio-mute text-[0.88rem]">Nothing to show yet.</p>}
          </Layer>
        </div>
      </Stage>
    </Frame>
  )
}

/** Side by side: the picture on the left, the name, badges and bio on the right, then the icons and links. */
export function Side() {
  const { socials, items } = useBio()
  return (
    <Frame>
      <Stage>
        <div className="px-6 pt-8 pb-7">
          <div className="flex items-center gap-5">
            <Layer z={54} className="shrink-0">
              <Part id="profile">
                <Avatar size={104} />
              </Part>
            </Layer>
            <Layer z={34} className="min-w-0 flex-1">
              <Part id="profile">
                <Name className="text-[clamp(1.5rem,6.4cqw,2.1rem)] leading-[1.1] font-semibold [overflow-wrap:anywhere]" style={{ textAlign: 'left' }} />
              </Part>
              <Badges center={false} className="mt-2" />
              <Part id="profile" className="mt-2">
                <Bio className="!max-w-none text-[0.9rem]" />
              </Part>
            </Layer>
          </div>
          {socials.length > 0 && (
            <Layer z={30} className="mt-5">
              <Part id="links">
                <Socials justify="start" />
              </Part>
            </Layer>
          )}
          {items.length > 0 && (
            <Layer z={14} className="mt-5 w-full">
              <Part id="links" className="w-full">
                <BlockList />
              </Part>
            </Layer>
          )}
        </div>
      </Stage>
    </Frame>
  )
}

/** A banner: the person's picture or video, or a soft wash of the page's colours. */
function useBanner() {
  const { cfg, mode } = useBio()
  const banner = cfg.card.banner
  const video = Boolean(banner) && mediaKindOf(banner) === 'video'
  const style: CSSProperties = banner && !video ? { background: `center / cover no-repeat url(${imgSrc(banner)})` } : cfg.colors.on ? { background: 'linear-gradient(135deg, var(--bio-accent), var(--bio-accent2))' } : { background: 'linear-gradient(135deg, rgb(var(--bio-fg-rgb) / 0.26), rgb(var(--bio-fg-rgb) / 0.06))' }
  return { style, video: video && mode !== 'mini' ? imgSrc(banner) : null }
}

/** Link list: no card. The picture and name, then wide buttons, one under the other. */
export function List() {
  const { socials, items } = useBio()
  return (
    <Frame>
      <div className="flex w-[min(34rem,calc(100cqw-2rem))] flex-col items-center text-center">
        <Part id="profile">
          <Avatar size={104} />
        </Part>
        <Title />
        <Part id="profile" className="mt-3 w-full">
          <Bio className="mx-auto !max-w-[28rem] text-[0.95rem]" center />
        </Part>
        {socials.length > 0 && (
          <Part id="links" className="mt-5">
            <Socials />
          </Part>
        )}
        {items.length > 0 && (
          <Part id="links" className="mt-6 w-full">
            <BlockList />
          </Part>
        )}
      </div>
    </Frame>
  )
}

/** Cover: a wide banner across the top, the picture over its lower edge, and everything below in a plain column. */
export function Cover() {
  const { socials, items, cfg } = useBio()
  const bg = useBackgroundClick()
  const { style, video } = useBanner()
  const circle = cfg.avatar.shape === 'circle'
  return (
    <main onClick={bg} className="min-h-full w-full pb-16">
      <Part id="card">
        <div className="relative h-[clamp(9rem,28cqh,16rem)] w-full overflow-hidden" style={style}>
          {video && <video src={video} muted loop playsInline autoPlay preload="metadata" className="absolute inset-0 size-full object-cover" />}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      </Part>
      <div className="mx-auto w-[min(36rem,calc(100cqw-2rem))]">
        <div className={cn('-mt-12 mb-3 inline-block bg-[var(--bio-bg)] p-[5px]', circle ? 'rounded-full' : 'rounded-[1.4rem]')}>
          <Part id="profile">
            <Avatar size={96} />
          </Part>
        </div>
        <Part id="profile">
          <Name className="text-[clamp(1.7rem,7cqw,2.3rem)] leading-[1.1] font-semibold [overflow-wrap:anywhere]" style={{ textAlign: 'left' }} />
        </Part>
        <Badges center={false} className="mt-2.5" />
        <Part id="profile" className="mt-3">
          <Bio className="!max-w-none text-[0.95rem]" />
        </Part>
        {socials.length > 0 && (
          <Part id="links" className="mt-5">
            <Socials justify="start" />
          </Part>
        )}
        {items.length > 0 && (
          <Part id="links" className="mt-6 w-full">
            <BlockList />
          </Part>
        )}
      </div>
    </main>
  )
}

/** Minimal: small and left-aligned, like a business card. The links are plain rows. */
export function Minimal() {
  const { socials, items } = useBio()
  return (
    <Frame>
      <div className="w-[min(30rem,calc(100cqw-2rem))] text-left">
        <div className="flex items-center gap-4">
          <Part id="profile" className="shrink-0">
            <Avatar size={64} />
          </Part>
          <div className="min-w-0">
            <Part id="profile">
              <Name className="text-[clamp(1.3rem,5.5cqw,1.7rem)] leading-[1.15] font-semibold [overflow-wrap:anywhere]" style={{ textAlign: 'left' }} />
            </Part>
            <Badges center={false} className="mt-1.5" />
          </div>
        </div>
        <Part id="profile" className="mt-4">
          <Bio className="!max-w-none text-[0.9rem]" />
        </Part>
        {socials.length > 0 && (
          <Part id="links" className="mt-4">
            <Socials justify="start" />
          </Part>
        )}
        {items.length > 0 && (
          <Part id="links" className="minimal-links mt-5 w-full">
            <BlockList />
          </Part>
        )}
      </div>
    </Frame>
  )
}
