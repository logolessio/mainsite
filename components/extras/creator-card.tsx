import Link from 'next/link'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import { InviteButton } from '@/components/extras/invite-button'
import type { Creator } from '@/lib/showcase'

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** One creator in the directory: picture, name, what they chose to show, and for a brand with a live campaign a way to invite them. */
export function CreatorCard({ c, campaigns }: { c: Creator; campaigns: { id: string; title: string }[] }) {
  return (
    <li className="flex flex-col rounded-card border border-line bg-white/[0.02] p-5">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.avatar} alt="" className="size-14 shrink-0 rounded-pill object-cover" />
        <div className="min-w-0">
          <Link href={`/@${c.handle}`} className="block truncate text-lg leading-tight underline-offset-4 hover:underline">
            {c.name}
          </Link>
          <p className="truncate text-sm text-mute">
            @{c.handle}
          </p>
        </div>
        {c.trusted && <span className="ml-auto shrink-0 rounded-chip border border-line-strong px-2 py-1 text-xs text-paper/80">Trusted</span>}
      </div>
      {c.bio && <p className="mt-4 line-clamp-2 text-sm leading-snug text-mute">{c.bio}</p>}
      <dl className="mt-4 flex gap-6 text-sm">
        {c.views !== null && (
          <div>
            <dt className="text-xs text-mute">Verified views</dt>
            <dd className="font-display text-xl tabular-nums">{compact(c.views)}</dd>
          </div>
        )}
        {c.clips !== null && (
          <div>
            <dt className="text-xs text-mute">Approved clips</dt>
            <dd className="font-display text-xl tabular-nums">{c.clips}</dd>
          </div>
        )}
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        {c.platforms.map((p) => (
          <span key={p} title={p} className="grid size-8 place-items-center rounded-pill border border-line text-mute">
            <BrandIcon name={p as BrandName} className="size-3.5" />
          </span>
        ))}
        <Link href={`/kit/${c.handle}`} className="ml-auto text-sm text-mute underline underline-offset-4 transition-colors hover:text-paper">
          Media kit
        </Link>
        {campaigns.length > 0 && <InviteButton handle={c.handle} name={c.name} campaigns={campaigns} />}
      </div>
    </li>
  )
}
