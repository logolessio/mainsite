'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { useNavUser } from '@/components/shell/nav-user'
import { FadeImg } from '@/components/ui/fade-img'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type Campaign, usd } from '@/lib/campaigns'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { PreviewPlayer } from './preview-player'
import { SubmitFlow } from './submit-flow'

/** An admin's dry run: the submission is not sent anywhere, and the check ends the way the admin picked. */
export type SheetPreview = 'approved' | 'declined' | 'review'

/**
 * Everything about a campaign in one wide rounded sheet: the cover (square) on the left, the numbers, the brief and the rules on
 * the right, and one pill across the bottom that starts the submission. Nothing scrolls. In the pop-up the sheet shrinks a little
 * to fit short screens; on its own page it is simply as tall as it needs to be and shows every line.
 */
export function CampaignSheet({ campaign, onClose, leftPct = null, inline = false, preview }: { campaign: Campaign; onClose?: () => void; leftPct?: number | null; inline?: boolean; preview?: SheetPreview }) {
  const [view, setView] = useState<'details' | 'submit'>('details')
  const { user } = useNavUser()
  const { wide } = useMotionPrefs()
  const signedIn = Boolean(preview) || Boolean(user?.signedIn)
  const left = leftPct === null ? null : Math.max(0, Math.min(100, Math.round(leftPct)))
  const cap = inline ? 99 : 3
  const root = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // s submits, f favourites and p plays: the keys for the three things you do on a campaign
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      const k = e.key.toLowerCase()
      if (k !== 's' && k !== 'f' && k !== 'p') return
      const el = root.current?.querySelector<HTMLElement>(`[data-key="${k}"]`)
      if (el && !(el as HTMLButtonElement).disabled) {
        e.preventDefault()
        el.click()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The pop-up never scrolls: if the sheet is taller than the screen it is shrunk to fit, down to two thirds of its size.
  useLayoutEffect(() => {
    const el = root.current
    if (inline || !el) return
    const fit = () => {
      const h = el.offsetHeight
      if (!h) return
      setScale(Math.max(0.66, Math.round(Math.min(1, (window.innerHeight - 24) / h) * 100) / 100))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [inline])

  const heading = (
    <div className="min-w-0">
      <p className="text-sm text-white/50">{campaign.type}</p>
      <h2 className="mt-1 line-clamp-2 font-display text-3xl leading-[1] md:text-[2.3rem]">{campaign.title}</h2>
      <p className="mt-1.5 truncate text-white/60">by {campaign.creator}</p>
    </div>
  )
  const cover = (
    <div className="aspect-square overflow-hidden rounded-[1.75rem] bg-white/10 max-md:size-24 max-md:shrink-0 max-md:rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <FadeImg src={campaign.cover} alt={`Cover of ${campaign.title} by ${campaign.creator}`} className="size-full scale-[1.07] object-cover" />
    </div>
  )
  const more = (n: number) => (n > cap ? <li className="text-white/45">+{n - cap} more on the campaign page</li> : null)
  const list = (title: string, items: string[]) => (
    <section className="min-w-0">
      <h3 className="text-[13px] text-white/50">{title}</h3>
      <ul className="mt-1.5 grid gap-1 text-[14px] leading-snug text-white/85">
        {items.length ? items.slice(0, cap).map((t) => <li key={t} className={cn(!inline && 'line-clamp-2')}>{t}</li>) : <li className="text-white/50">Nothing specific.</li>}
        {more(items.length)}
      </ul>
    </section>
  )

  const info = (
    <div className="flex min-w-0 flex-col gap-4">
      {wide && <div className="pr-10">{heading}</div>}

      <dl className="grid grid-cols-3 gap-2.5 text-center">
        {[
          ['You earn', usd(campaign.ratePer1k, 2), 'per 1,000 views'],
          ['Budget', usd(campaign.budget), left === null ? 'to be paid out' : `${left}% left`],
          ['Ends', campaign.endsOn || 'Open', 'deadline'],
        ].map(([k, v, s]) => (
          <div key={k} className="rounded-2xl border border-white/10 px-2 py-3">
            <dt className="text-[12px] text-white/50">{k}</dt>
            <dd className="mt-0.5 font-display text-2xl">{v}</dd>
            <dd className="text-[11px] text-white/40">{s}</dd>
          </div>
        ))}
      </dl>
      {(campaign.capPerPost || campaign.capPerUser) && (
        <p className="-mt-1 text-center text-[12.5px] text-white/50">
          Up to {[campaign.capPerPost ? `${usd(campaign.capPerPost)} per clip` : '', campaign.capPerUser ? `${usd(campaign.capPerUser)} per clipper` : ''].filter(Boolean).join(' · ')}
        </p>
      )}

      <ul aria-label="Platforms that count" className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] text-white/70">
        {campaign.platforms.map((p) => (
          <li key={p} className="inline-flex items-center gap-2">
            <BrandIcon name={p} className="size-4" />
            {PLATFORM_LABEL[p]}
          </li>
        ))}
      </ul>

      {!wide && <PreviewPlayer campaign={campaign} />}

      <section>
        <h3 className="text-[13px] text-white/50">The brief</h3>
        <p className={cn('mt-1.5 text-[15px] leading-relaxed text-white/90', !inline && 'line-clamp-3')}>{campaign.summary}</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        {list('Clip this', campaign.clipThis)}
        {list('Not allowed', campaign.offLimits)}
      </div>

      <p className="text-[12.5px] leading-relaxed text-white/45">
        Earnings can be withdrawn as soon as they are confirmed, from ${SITE.minPayoutUsd}.{' '}
        <Link href="/legal/campaign-rules" onClick={onClose} className="text-white/80 underline underline-offset-4">
          Campaign rules
        </Link>
        {' · '}
        <Link href={`/report?about=campaign&ref=${encodeURIComponent(`${campaign.title} by ${campaign.creator}`)}`} onClick={onClose} className="text-white/80 underline underline-offset-4">
          Report
        </Link>
      </p>
    </div>
  )

  return (
    <div ref={root} data-kb-keys style={scale < 1 ? { transform: `scale(${scale})` } : undefined} className={cn('island relative w-full max-w-[1000px] rounded-[2.5rem] bg-[#0b0b0d] p-5 text-white md:p-8', inline && 'mx-auto')}>
      {view === 'details' && onClose && (
        <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white md:top-6 md:right-6">
          <X className="size-5" />
        </button>
      )}

      {view === 'submit' && !wide ? (
        <SubmitFlow campaign={campaign} preview={preview} onBack={() => setView('details')} onClose={onClose} />
      ) : (
        <div className={cn(wide ? 'grid grid-cols-[minmax(0,9fr)_minmax(0,11fr)] gap-8' : 'grid gap-5')}>
          {wide ? (
            <div className="flex min-w-0 flex-col gap-3 self-start">
              {cover}
              <PreviewPlayer campaign={campaign} />
            </div>
          ) : (
            <div className="flex items-start gap-4 pr-10">
              {cover}
              <div className="min-w-0 flex-1 pt-1">{heading}</div>
            </div>
          )}
          {view === 'submit' ? <SubmitFlow campaign={campaign} preview={preview} onBack={() => setView('details')} onClose={onClose} /> : info}
        </div>
      )}

      {view === 'details' && (
        <div className="mt-5">
          {signedIn ? (
            <button type="button" onClick={() => setView('submit')} data-key="s" data-key-label="Submit content" aria-keyshortcuts="s" className="h-14 w-full rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85">
              Submit content
            </button>
          ) : (
            <Link href="/login" data-key="s" data-key-label="Log in to submit" aria-keyshortcuts="s" className="inline-flex h-14 w-full items-center justify-center rounded-full bg-white text-[16px] font-medium text-black transition-colors hover:bg-white/85">
              Log in to submit content
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
