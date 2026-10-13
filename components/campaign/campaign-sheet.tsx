'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { useNavUser } from '@/components/shell/nav-user'
import { type Campaign, usd } from '@/lib/campaigns'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { PreviewPlayer } from './preview-player'
import { SubmitFlow } from './submit-flow'

/**
 * Everything about a campaign in one rounded sheet: the numbers, the brief, the rules and the preview. One wide pill at the bottom
 * starts the submission, which then runs inside the same sheet. It is a black panel on the white page, whether it floats over
 * the campaign list or sits on its own page.
 */
export function CampaignSheet({ campaign, onClose, poolLeftCents = null, inline = false }: { campaign: Campaign; onClose?: () => void; poolLeftCents?: number | null; inline?: boolean }) {
  const [view, setView] = useState<'details' | 'submit'>('details')
  const { user } = useNavUser()
  const signedIn = Boolean(user?.signedIn)
  const left = poolLeftCents === null ? null : Math.max(0, Math.min(100, Math.round((poolLeftCents / 100 / Math.max(1, campaign.budget)) * 100)))

  return (
    <div className={cn('island relative bg-[#0b0b0d] text-white', inline ? 'mx-auto w-full max-w-[640px] rounded-[2.75rem]' : 'flex max-h-[90dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-[2.75rem]')}>
      <div className={cn('px-6 pt-6 pb-2 md:px-9 md:pt-8', !inline && 'flex-1 overflow-y-auto overscroll-contain')}>
        {view === 'submit' ? (
          <SubmitFlow campaign={campaign} onBack={() => setView('details')} onClose={onClose} />
        ) : (
          <>
            <div className="flex items-start gap-5">
              <div className="size-24 shrink-0 overflow-hidden rounded-3xl bg-white/10 md:size-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={campaign.cover} alt={`Cover of ${campaign.title} by ${campaign.creator}`} className="size-full scale-[1.07] object-cover" />
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <p className="text-sm text-white/50">{campaign.type}</p>
                <h2 className="mt-1 font-display text-3xl leading-[1] md:text-[2.4rem]">{campaign.title}</h2>
                <p className="mt-2 text-white/60">by {campaign.creator}</p>
              </div>
              {onClose && (
                <button type="button" aria-label="Close" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                  <X className="size-5" />
                </button>
              )}
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-3 text-center">
              {[
                ['You earn', `${usd(campaign.ratePer1k, 2)}`, 'per 1,000 views'],
                ['Budget', usd(campaign.budget), left === null ? 'in the pool' : `${left}% left`],
                ['Ends', campaign.endsOn || 'Open', 'deadline'],
              ].map(([k, v, s]) => (
                <div key={k} className="rounded-3xl border border-white/10 px-2 py-4">
                  <dt className="text-[13px] text-white/50">{k}</dt>
                  <dd className="mt-1 font-display text-2xl md:text-3xl">{v}</dd>
                  <p className="mt-0.5 text-[12px] text-white/40">{s}</p>
                </div>
              ))}
            </dl>

            <ul aria-label="Platforms that count" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/70">
              {campaign.platforms.map((p) => (
                <li key={p} className="inline-flex items-center gap-2">
                  <BrandIcon name={p} className="size-4" />
                  {PLATFORM_LABEL[p]}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <PreviewPlayer campaign={campaign} />
            </div>

            <section className="mt-8">
              <h3 className="text-sm text-white/50">The brief</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-white/90">{campaign.summary}</p>
            </section>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <section>
                <h3 className="text-sm text-white/50">Clip this</h3>
                <ul className="mt-2 grid gap-2 text-[15px] leading-relaxed text-white/85">
                  {campaign.clipThis.length ? campaign.clipThis.map((t) => <li key={t}>{t}</li>) : <li className="text-white/50">Nothing specific.</li>}
                </ul>
              </section>
              <section>
                <h3 className="text-sm text-white/50">Not allowed</h3>
                <ul className="mt-2 grid gap-2 text-[15px] leading-relaxed text-white/85">
                  {campaign.offLimits.length ? campaign.offLimits.map((t) => <li key={t}>{t}</li>) : <li className="text-white/50">Nothing specific.</li>}
                </ul>
              </section>
            </div>

            <section className="mt-8">
              <h3 className="text-sm text-white/50">How you get paid</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                Post your clip on your own account and submit the link. We check it and its views, and approved earnings clear after {SITE.holdDays} days. Withdraw once your balance is ${SITE.minPayoutUsd}.{' '}
                <Link href="/legal/campaign-rules" className="text-white underline underline-offset-4">
                  Campaign rules
                </Link>
              </p>
            </section>
          </>
        )}
      </div>

      {view === 'details' && (
        <div className="shrink-0 bg-gradient-to-t from-[#0b0b0d] from-70% to-transparent px-6 pt-6 pb-6 md:px-9 md:pb-8">
          {signedIn ? (
            <button type="button" onClick={() => setView('submit')} className="h-14 w-full rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85">
              Submit content
            </button>
          ) : (
            <Link href="/login" className="inline-flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85">
              Log in to submit content
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
