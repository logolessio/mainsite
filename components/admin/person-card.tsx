'use client'

import Link from 'next/link'
import { BadgeArt } from '@/components/badges/badge-art'
import { bannerStyle } from '@/components/profile/profile-card'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

export type PersonPreview = {
  id: string
  handle: string | null
  name: string
  avatar: string | null
  bannerKind: 'preset' | 'image' | 'color'
  banner: string
  badges: string[]
  roles: string[]
  owner: boolean
  status: string
  online: boolean
}

/** A small preview of someone's profile: banner, picture, name and badges. The whole card opens the full profile. */
export function PersonCard({ p }: { p: PersonPreview }) {
  const badges = p.badges.map((id) => BADGE_BY_ID[id]).filter(Boolean).slice(0, 5)
  return (
    <Link
      href={`/admin/people/${p.id}`}
      className="group/p block overflow-hidden rounded-[22px] border border-line bg-surface/70 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="relative h-20" style={bannerStyle(p.bannerKind, p.banner)}>
        {p.status !== 'active' && <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] text-signal uppercase">{p.status}</span>}
      </div>
      <div className="relative px-4 pb-4">
        <span className="relative -mt-8 block size-16 overflow-hidden rounded-full border-4 border-[#0b0b0d] bg-surface">
          {p.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center font-display text-2xl text-mute">{p.name.slice(0, 1).toUpperCase() || '?'}</span>
          )}
          <span aria-hidden="true" className={cn('absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-2 border-[#0b0b0d]', p.online ? 'bg-emerald-400' : 'bg-white/25')} />
        </span>
        <div className="mt-2 flex items-center gap-1.5">
          <p className="truncate font-display text-xl leading-tight">{p.name || 'No name yet'}</p>
          <span className="flex shrink-0 items-center gap-0.5">
            {badges.map((b) => (
              <BadgeArt key={b.id} badge={b} size={16} />
            ))}
          </span>
        </div>
        <p className="truncate text-xs text-mute">{p.handle ? `@${p.handle}` : 'no profile yet'}</p>
        {(p.owner || p.roles.length > 0) && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {p.owner && <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] text-ink uppercase">Owner</span>}
            {!p.owner && p.roles.map((r) => <span key={r} className="rounded-full border border-line-strong px-2 py-0.5 font-mono text-[10px] text-paper/80 uppercase">{r}</span>)}
          </p>
        )}
      </div>
    </Link>
  )
}
