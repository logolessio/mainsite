'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The welcome card a new member gets in the Discord server (see lib/discord/member-cards.ts), drawn here so the sign-up can show it before it is sent: the
 * gradient banner, their Discord picture, their name and username, and their status. On the profile step it follows what they type.
 */
export function MemberCard({ name, handle, image, n, founding = true, className }: { name: string; handle?: string; image?: string | null; n: number | null; founding?: boolean; className?: string }) {
  const shown = name.trim() || 'your name'
  return (
    <div aria-label={`Preview of your welcome in the server: ${shown}`} className={cn('overflow-hidden rounded-[calc(20px*var(--round,1))] border border-white/10 bg-[#0c0c10]', className)}>
      <div aria-hidden="true" className="h-14 bg-cover bg-center" style={{ backgroundImage: 'url(/discord/gradient-banner.jpg)' }} />
      <div className="flex items-center gap-3.5 px-4 pt-3.5 pb-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-full bg-white/10 object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-white/10 text-[17px] text-paper/70 uppercase">
            {shown.slice(0, 1)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] leading-tight font-semibold text-paper">Welcome, {shown}</span>
          <span className="mt-0.5 block truncate text-[13px] text-paper/45">{handle ? `@${handle}` : 'your username'}</span>
          <span className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-paper/80">
            <Check aria-hidden="true" className="size-3.5 text-teal-300" />
            {n ? (founding ? `Founding member #${n}` : `Verified member #${n}`) : 'Founding member'}
          </span>
        </span>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-cover" style={{ backgroundImage: 'url(/discord/gradient-bar.png)' }} />
    </div>
  )
}
