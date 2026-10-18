'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Banknote, Bell, Check, CircleDollarSign, Clapperboard, LayoutDashboard, Lightbulb, Megaphone, Plug, Settings as SettingsIcon, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { cn } from '@/lib/utils'

type Role = 'clipper' | 'brand'
type Kind = 'overview' | 'submissions' | 'earnings' | 'profile' | 'settings' | 'campaigns' | 'balance' | 'brand-overview' | 'brand-submissions'
type Icon = React.ComponentType<{ className?: string }>
type Stop = { icon: Icon; label: string; title: string; text: string; tip: string; mock: Kind }

/** What each stop of the walk shows, in the order of the dashboard's own menu. The pictures use made-up numbers. */
export const TOUR: Record<Role, Stop[]> = {
  clipper: [
    { icon: LayoutDashboard, label: 'Overview', title: 'Your home base.', text: 'Your balance, how your submissions are going, and the next thing to do to get set up.', tip: 'Start with the setup guide: it takes about five minutes.', mock: 'overview' },
    { icon: Clapperboard, label: 'Submissions', title: 'Paste a link, we do the rest.', text: 'Paste the link to something you posted. We take a first look right away, and a person checks anything unclear.', tip: 'Most clips are checked within seconds.', mock: 'submissions' },
    { icon: CircleDollarSign, label: 'Earnings', title: 'Watch it add up.', text: 'Approved views are counted here. Withdraw to your PayPal once you reach the minimum.', tip: 'Add your PayPal email first so withdrawing is one tap.', mock: 'earnings' },
    { icon: UserRound, label: 'Profile', title: 'Your public page.', text: 'Your look, a bio, and the accounts you post from. Brands see it before they work with you.', tip: 'Verify your accounts with a code in your bio.', mock: 'profile' },
    { icon: SettingsIcon, label: 'Settings', title: 'Make it quiet, or loud.', text: 'Notifications, Discord, your password and your account.', tip: 'Connect Discord to hear about new campaigns first.', mock: 'settings' },
  ],
  brand: [
    { icon: LayoutDashboard, label: 'Overview', title: 'The whole picture.', text: 'How your campaigns are doing, and the next thing to do to get set up.', tip: 'The setup guide shows what is left before you launch.', mock: 'brand-overview' },
    { icon: Megaphone, label: 'Campaigns', title: 'Launch in minutes.', text: 'Launch a campaign with a brief, a rate and a budget cap. Pause it or change its budget any time.', tip: 'A clear brief gets better clips.', mock: 'campaigns' },
    { icon: Clapperboard, label: 'Submissions', title: 'Everything made for you.', text: 'Everything made for your campaigns, with its views and its status.', tip: 'Open any clip to see where it was posted.', mock: 'brand-submissions' },
    { icon: Banknote, label: 'Balance', title: 'One balance for all of it.', text: 'Add funds once. Every campaign draws from the same balance as creators earn.', tip: 'Each campaign has its own cap, so none can overspend.', mock: 'balance' },
    { icon: SettingsIcon, label: 'Settings', title: 'Make it quiet, or loud.', text: 'Notifications, Discord, your password and your account.', tip: 'Turn on email for the moments that matter.', mock: 'settings' },
  ],
}

const box = 'rounded-[calc(0.9rem*var(--round,1))] border border-line bg-white/[0.04]'
const chip = (c: 'green' | 'amber' | 'blue') => cn('inline-flex h-5 items-center rounded-pill px-2 text-[10.5px]', c === 'green' ? 'bg-emerald-500/15 text-emerald-300' : c === 'amber' ? 'bg-amber-400/15 text-amber-200' : 'bg-sky-400/15 text-sky-200')

/** A soft pulse around the part of a picture the words are about. */
function Hot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -inset-1 rounded-[inherit] ring-2 ring-paper/70 motion-safe:animate-pulse" />
      {children}
    </span>
  )
}

const rise = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] as const } })

function Heading({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <p className="font-display text-xl leading-none">{children}</p>
      {note && <p className="text-[11px] text-paper/40">{note}</p>}
    </div>
  )
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div className={cn(box, 'px-3 py-2.5')}>
      <p className="text-lg leading-none tabular-nums">{v}</p>
      <p className="mt-1.5 text-[11px] text-paper/45">{k}</p>
    </div>
  )
}

function Row({ children, i }: { children: React.ReactNode; i: number }) {
  return (
    <motion.li {...rise(i)} className={cn(box, 'flex items-center gap-3 px-3 py-2.5')}>
      {children}
    </motion.li>
  )
}

function Thumb({ n }: { n: number }) {
  return <span aria-hidden="true" className="size-8 shrink-0 rounded-[8px] bg-cover bg-center" style={{ backgroundImage: `url(/covers/0${n}.jpg)` }} />
}

function Mock({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'overview':
      return (
        <>
          <Heading note="Example numbers">Overview</Heading>
          <motion.div {...rise(0)} className={cn(box, 'flex items-end justify-between px-4 py-3.5')}>
            <div>
              <p className="text-[11px] text-paper/45">Available to withdraw</p>
              <p className="mt-1 font-display text-4xl leading-none tabular-nums">$128.40</p>
            </div>
            <span className={chip('green')}>+ $12.10 today</span>
          </motion.div>
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {[['48.2K', 'Verified views'], ['12', 'Clips'], ['9', 'Approved']].map(([v, k], n) => (
              <motion.div key={k} {...rise(n + 1)}>
                <Stat v={v} k={k} />
              </motion.div>
            ))}
          </div>
          <motion.div {...rise(4)} className="mt-2.5 flex items-center justify-between rounded-pill bg-paper px-4 py-2.5 text-ink">
            <span className="text-[13px]">Next step: link your TikTok</span>
            <Hot className="rounded-pill">
              <ArrowRight className="size-4" aria-hidden="true" />
            </Hot>
          </motion.div>
        </>
      )
    case 'submissions':
      return (
        <>
          <Heading note="Example clips">Submissions</Heading>
          <motion.div {...rise(0)} className={cn(box, 'mb-2.5 flex items-center gap-2 px-3 py-2.5 text-[13px] text-paper/45')}>
            <span className="flex-1 truncate">Paste the link to your post</span>
            <Hot className="rounded-pill">
              <span className="inline-flex h-7 items-center rounded-pill bg-paper px-3 text-[12px] text-ink">Submit</span>
            </Hot>
          </motion.div>
          <ul className="grid gap-2">
            {[
              ['Red Room', 'tiktok', 'Approved', 'green', '18.4K', 1],
              ['Night Drive', 'instagram', 'Checking', 'amber', '6.1K', 7],
              ['Static Bloom', 'youtube', 'Paid', 'blue', '23.7K', 4],
            ].map(([t, p, s, c, v, n], i) => (
              <Row key={t as string} i={i + 1}>
                <Thumb n={n as number} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{t}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper/45">
                    <BrandIcon name={p as string} className="size-3" /> {v} views
                  </span>
                </span>
                <span className={chip(c as 'green')}>{s}</span>
              </Row>
            ))}
          </ul>
        </>
      )
    case 'earnings': {
      const bars = [28, 46, 36, 62, 54, 80, 96]
      return (
        <>
          <Heading note="Last 7 days, example">Earnings</Heading>
          <motion.div {...rise(0)} className={cn(box, 'px-4 pt-3.5 pb-3')}>
            <div className="flex items-end justify-between">
              <p className="font-display text-4xl leading-none tabular-nums">$128.40</p>
              <Hot className="rounded-pill">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-paper px-3.5 text-[12px] text-ink">
                  <Banknote className="size-3.5" aria-hidden="true" /> Withdraw
                </span>
              </Hot>
            </div>
            <div className="mt-4 flex h-20 items-end gap-2" aria-hidden="true">
              {bars.map((h, n) => (
                <motion.span key={n} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 0.7, delay: 0.1 + n * 0.05, ease: [0.22, 1, 0.36, 1] }} className={cn('flex-1 rounded-t-[5px]', n === bars.length - 1 ? 'bg-paper' : 'bg-paper/25')} />
              ))}
            </div>
          </motion.div>
          <motion.p {...rise(2)} className="mt-2.5 flex items-center gap-2 text-[12px] text-paper/50">
            <Check className="size-3.5 text-emerald-400" aria-hidden="true" /> Minimum to withdraw is $10. PayPal fees are on us.
          </motion.p>
        </>
      )
    }
    case 'profile':
      return (
        <>
          <Heading note="This is public">Profile</Heading>
          <motion.div {...rise(0)} className={cn(box, 'overflow-hidden')}>
            <div className="h-16" style={{ background: 'radial-gradient(120% 140% at 15% 0%, #6d5bd0 0%, #2a2a5e 45%, #101018 100%)' }} />
            <div className="-mt-6 flex items-end justify-between px-4 pb-3.5">
              <div className="flex items-end gap-3">
                <span className="size-14 rounded-full border-2 border-ink" style={{ background: 'radial-gradient(circle at 30% 25%, #ffd9a8, #e0707a 55%, #4a2a6a)' }} aria-hidden="true" />
                <div className="pb-0.5">
                  <p className="font-display text-xl leading-none">Your name</p>
                  <p className="mt-1 text-[11px] text-paper/45">logoless.io/@you</p>
                </div>
              </div>
              <span className="mb-1 flex gap-1.5">
                {['tiktok', 'instagram', 'youtube'].map((b, n) => {
                  const dot = (
                    <span className="grid size-7 place-items-center rounded-pill border border-line bg-white/[0.06]">
                      <BrandIcon name={b} className="size-3.5" />
                    </span>
                  )
                  return n === 0 ? (
                    <Hot key={b} className="rounded-pill">
                      {dot}
                    </Hot>
                  ) : (
                    <span key={b}>{dot}</span>
                  )
                })}
              </span>
            </div>
          </motion.div>
          <motion.p {...rise(2)} className="mt-2.5 text-[12px] text-paper/50">Verified accounts get a tick, and brands notice.</motion.p>
        </>
      )
    case 'settings':
      return (
        <>
          <Heading>Settings</Heading>
          <ul className="grid gap-2">
            {[
              [Bell, 'Email me about payouts', true],
              [Plug, 'Discord', true],
              [SettingsIcon, 'Password and account', false],
            ].map(([I, t, on], i) => {
              const Ico = I as Icon
              return (
                <Row key={t as string} i={i}>
                  <Ico className="size-4 text-paper/60" />
                  <span className="flex-1 text-[13px]">{t as string}</span>
                  {on ? (
                    <Hot className="rounded-pill">
                      <span className="inline-flex h-5 w-9 items-center justify-end rounded-pill bg-paper px-0.5">
                        <span className="size-4 rounded-full bg-ink" />
                      </span>
                    </Hot>
                  ) : (
                    <ArrowRight className="size-4 text-paper/40" aria-hidden="true" />
                  )}
                </Row>
              )
            })}
          </ul>
        </>
      )
    case 'brand-overview':
      return (
        <>
          <Heading note="Example numbers">Overview</Heading>
          <div className="grid grid-cols-3 gap-2.5">
            {[['3', 'Live campaigns'], ['214K', 'Views bought'], ['$640', 'Spent']].map(([v, k], n) => (
              <motion.div key={k} {...rise(n)}>
                <Stat v={v} k={k} />
              </motion.div>
            ))}
          </div>
          <motion.div {...rise(3)} className={cn(box, 'mt-2.5 flex items-center justify-between px-4 py-3')}>
            <div>
              <p className="text-[11px] text-paper/45">Balance</p>
              <p className="mt-1 font-display text-3xl leading-none tabular-nums">$1,360.00</p>
            </div>
            <Hot className="rounded-pill">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-paper px-3.5 text-[12px] text-ink">
                <Megaphone className="size-3.5" aria-hidden="true" /> New campaign
              </span>
            </Hot>
          </motion.div>
        </>
      )
    case 'campaigns':
      return (
        <>
          <Heading note="Example campaigns">Campaigns</Heading>
          <ul className="grid gap-2">
            {[
              ['Red Room', '$3 per 1K', 62, 1],
              ['Static Bloom', '$2.50 per 1K', 28, 4],
              ['Night Drive', '$4 per 1K', 91, 7],
            ].map(([t, r, p, n], i) => (
              <Row key={t as string} i={i}>
                <Thumb n={n as number} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between text-[13px]">
                    <span className="truncate">{t}</span>
                    <span className="shrink-0 text-[11px] text-paper/50">{r}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-pill bg-white/10">
                    <motion.span initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }} className="block h-full rounded-pill bg-paper" />
                  </span>
                </span>
              </Row>
            ))}
          </ul>
          <motion.div {...rise(3)} className="mt-2.5">
            <Hot className="rounded-pill">
              <span className="inline-flex h-8 items-center rounded-pill border border-line-strong px-4 text-[12px]">Pause or change budget</span>
            </Hot>
          </motion.div>
        </>
      )
    case 'brand-submissions':
      return (
        <>
          <Heading note="Example clips">Submissions</Heading>
          <ul className="grid gap-2">
            {[
              ['@maya.cuts', 'tiktok', '41.2K', 'Approved', 'green', 1],
              ['@clipwolf', 'youtube', '18.9K', 'Approved', 'green', 4],
              ['@nova', 'instagram', '3.3K', 'Checking', 'amber', 7],
            ].map(([h, p, v, s, c, n], i) => (
              <Row key={h as string} i={i}>
                <Thumb n={n as number} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{h}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper/45">
                    <BrandIcon name={p as string} className="size-3" /> {v} views
                  </span>
                </span>
                <span className={chip(c as 'green')}>{s}</span>
              </Row>
            ))}
          </ul>
        </>
      )
    case 'balance':
      return (
        <>
          <Heading note="Example">Balance</Heading>
          <motion.div {...rise(0)} className={cn(box, 'px-4 py-3.5')}>
            <p className="text-[11px] text-paper/45">Available</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="font-display text-4xl leading-none tabular-nums">$1,360.00</p>
              <Hot className="rounded-pill">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-pill bg-paper px-3.5 text-[12px] text-ink">
                  <CircleDollarSign className="size-3.5" aria-hidden="true" /> Add funds
                </span>
              </Hot>
            </div>
          </motion.div>
          <ul className="mt-2.5 grid gap-2">
            {[['Red Room', '$310 drawn'], ['Static Bloom', '$180 drawn']].map(([t, a], i) => (
              <Row key={t} i={i + 1}>
                <span className="flex-1 text-[13px]">{t}</span>
                <span className="text-[11px] text-paper/50">{a}</span>
              </Row>
            ))}
          </ul>
        </>
      )
  }
}

/**
 * The walk through the dashboard after sign up: a small window with the dashboard's own menu on the left and, for each stop, a picture
 * of that page with the one thing to notice pulsing. The arrow keys move through it. Sample numbers only; nothing here is the person's data.
 */
export function Tour({ role, onFinish, primary, quiet }: { role: Role; onFinish: () => void; primary: string; quiet: string }) {
  const stops = TOUR[role]
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [seen, setSeen] = useState<number[]>([0])
  const last = i === stops.length - 1
  const stop = stops[i]

  const go = useCallback(
    (n: number) => {
      if (n < 0 || n >= stops.length) return
      setDir(n > i ? 1 : -1)
      setI(n)
      setSeen((s) => (s.includes(n) ? s : [...s, n]))
    },
    [i, stops.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, i])

  return (
    <div className="w-full max-w-2xl text-left">
      <div className="mb-4 flex items-center gap-1.5" role="group" aria-label={`Step ${i + 1} of ${stops.length}`}>
        {stops.map((s, n) => (
          <button key={s.label} type="button" onClick={() => go(n)} aria-label={`${s.label}, step ${n + 1}`} aria-current={n === i ? 'step' : undefined} className="group/seg h-5 flex-1 outline-none">
            <span className={cn('mt-2 block h-1 rounded-pill transition-colors duration-300 group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-paper/60', n === i ? 'bg-paper' : seen.includes(n) ? 'bg-paper/45' : 'bg-paper/15')} />
          </button>
        ))}
      </div>

      <div className="grid overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-black/25 backdrop-blur-md sm:grid-cols-[12rem_1fr]">
        <ul className="flex gap-1 overflow-x-auto border-b border-line-strong p-2.5 sm:grid sm:content-start sm:border-r sm:border-b-0 sm:p-3" aria-label="Dashboard sections">
          {stops.map((s, n) => (
            <li key={s.label} className="shrink-0">
              <button type="button" onClick={() => go(n)} aria-current={n === i} className="relative flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-paper/60">
                {n === i && <motion.span layoutId="tour-hl" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-xl bg-paper" />}
                <s.icon className={cn('relative size-4', n === i ? 'text-ink' : 'text-mute')} />
                <span className={cn('relative', n === i ? 'text-ink' : 'text-mute')}>{s.label}</span>
                {n !== i && seen.includes(n) && <Check aria-hidden="true" className="relative ml-auto hidden size-3.5 text-paper/35 sm:block" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="relative min-h-[19rem] overflow-hidden p-4 sm:p-5" aria-live="polite">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div key={i} custom={dir} initial={{ opacity: 0, x: 22 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 * dir }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <Mock kind={stop.mock} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="mt-6 min-h-[8.5rem] text-center">
          <p className="text-[13px] text-paper/45">
            {i + 1} of {stops.length}
          </p>
          <p className="mt-1.5 font-display text-3xl leading-tight">{stop.title}</p>
          <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-mute">{stop.text}</p>
          <p className="mx-auto mt-3 inline-flex max-w-md items-start gap-2 rounded-pill border border-line px-4 py-2 text-left text-[13px] text-paper/60">
            <Lightbulb aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /> {stop.tip}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className={cn(quiet, 'inline-flex items-center gap-2 disabled:invisible')}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </button>
        <button type="button" onClick={() => (last ? onFinish() : go(i + 1))} className={primary}>
          {last ? 'Got it' : 'Next'}
        </button>
        {!last && (
          <button type="button" onClick={onFinish} className={quiet}>
            Skip
          </button>
        )}
      </div>
      <p className="mt-4 hidden text-center text-[12px] text-paper/30 sm:block">Use the left and right arrow keys to move along.</p>
    </div>
  )
}
