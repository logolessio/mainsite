'use client'

import { type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockList, Footer, Name, Socials } from './bits'
import { Badges, GlassCard } from './card'
import { useBio } from './context'

/** A small heading over a part of the card. */
const Label = ({ children }: { children: string }) => <h2 className="bio-mute mb-2 text-[0.68rem] font-semibold tracking-[0.14em] uppercase">{children}</h2>

/**
 * 0. Card: the page as a profile. One card floats over the background (it drifts a little and leans towards the pointer): a banner across the top,
 * the picture over its lower edge, the name with its badges, and an "about me" panel that holds the bio, the accounts and the links.
 */
export function Card() {
  const { data, cfg, items, socials, mode, reduced } = useBio()
  const custom = cfg.colors.on
  const banner = cfg.card.banner
  const bannerStyle: CSSProperties = banner
    ? { background: `center / cover no-repeat url(/api/img/${banner})` }
    : custom
      ? { background: 'linear-gradient(135deg, var(--bio-accent), var(--bio-accent2))' }
      : { background: 'linear-gradient(135deg, rgb(var(--bio-fg-rgb) / 0.28), rgb(var(--bio-fg-rgb) / 0.07))' }
  const circle = cfg.avatar.shape === 'circle'
  const drift = !reduced && mode !== 'mini'
  const where = cfg.meta.location
  const hasLinks = items.length > 0

  return (
    <main className="grid min-h-full w-full place-items-center px-4 py-10 md:py-16">
      <div className="flex flex-col items-center">
        <div style={{ animation: drift ? 'bio-float 7s ease-in-out infinite' : undefined }}>
          <GlassCard always radius="30px" className="w-[min(27.5rem,calc(100cqw-2rem))] overflow-hidden">
            <div className="relative h-[8.25rem] overflow-hidden" style={bannerStyle}>
              <span aria-hidden="true" className="card-sheen absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
            </div>
            <div className="relative px-5 pb-5">
              <div className={cn('-mt-[3.4rem] mb-3 inline-block bg-[var(--bio-bg)] p-[5px]', circle ? 'rounded-full' : 'rounded-[1.4rem]')} style={{ boxShadow: custom ? '0 0 38px -8px var(--bio-accent)' : undefined }}>
                <Avatar size={96} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Name className="min-w-0 text-[clamp(1.6rem,7cqw,2.1rem)] leading-tight font-semibold [overflow-wrap:anywhere]" style={{ textAlign: 'left' }} />
                <Badges center={false} className="min-w-0" />
              </div>
              <p className="bio-mute mt-1 text-[0.82rem]">
                logoless.io/{data.handle}
                {where && !cfg.meta.badges ? ` · ${where}` : ''}
              </p>

              <div className="mt-5 grid gap-5 rounded-[1.4rem] border border-[var(--bio-line)] bg-[rgb(var(--bio-fg-rgb)/0.06)] p-4">
                {data.bio && (
                  <section>
                    <Label>About me</Label>
                    <Bio className="!max-w-none text-[0.92rem]" />
                  </section>
                )}
                {socials.length > 0 && (
                  <section>
                    <Label>Find me on</Label>
                    <Socials justify="start" />
                  </section>
                )}
                {hasLinks && (
                  <section>
                    <Label>Links</Label>
                    <BlockList />
                  </section>
                )}
                {!data.bio && !socials.length && !hasLinks && <p className="bio-mute text-[0.88rem]">Nothing to show yet.</p>}
              </div>
            </div>
          </GlassCard>
        </div>
        <Footer className="pt-8 pb-0" />
      </div>
    </main>
  )
}
