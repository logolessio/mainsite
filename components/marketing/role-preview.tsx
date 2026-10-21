'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Check, CircleDollarSign, Clapperboard, Code2, Copy, LayoutDashboard, Link2, Megaphone, Plus, ShieldCheck, Wallet, X, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { useFeature } from '@/components/shell/features-provider'
import { CONTAINER, EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type PreviewRole = 'creator' | 'brand' | 'developer'

type Tab = { id: string; label: string; icon: LucideIcon }
const TABS: Record<PreviewRole, Tab[]> = {
  creator: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'clips', label: 'Submissions', icon: Clapperboard },
    { id: 'earnings', label: 'Earnings', icon: CircleDollarSign },
  ],
  brand: [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'review', label: 'Submissions', icon: Clapperboard },
    { id: 'balance', label: 'Balance', icon: Wallet },
  ],
  developer: [
    { id: 'apps', label: 'Your apps', icon: Code2 },
    { id: 'consent', label: 'Sign-in screen', icon: ShieldCheck },
    { id: 'stats', label: 'Sign-ins', icon: BarChart3 },
  ],
}

const COPY: Record<PreviewRole, { title: string; lede: string; area: string }> = {
  creator: { title: 'Your dashboard, before you sign up', lede: 'Click around: this is what you get, with made-up numbers.', area: 'Creator' },
  brand: { title: 'Run a campaign from one place', lede: 'Approve a clip, add funds, watch the views add up. Sample data, nothing is sent.', area: 'Brand' },
  developer: { title: 'Your apps, at a glance', lede: 'Register an app, copy the client id, see the screen people will approve. A preview, nothing is saved.', area: 'Developers' },
}

/**
 * A small, working model of a dashboard on the For creators, For brands and Developers pages: a sidebar, a top bar and a few panels that
 * can be clicked. Everything is sample data held in the browser; nothing is saved or sent.
 */
export function RolePreview({ role }: { role: PreviewRole }) {
  const on = useFeature('role-previews')
  const [tab, setTab] = useState(TABS[role][0].id)
  if (!on) return null
  const c = COPY[role]
  return (
    <section aria-labelledby={`preview-${role}`} className={cn(CONTAINER, 'border-t border-line py-24 md:py-36')}>
      <div className="grid gap-6 md:grid-cols-12 md:items-end md:gap-10">
        <h2 id={`preview-${role}`} className="max-w-[14ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:col-span-6 md:text-[4.2rem]">
          {c.title}
        </h2>
        <p className="max-w-md text-pretty text-lg leading-relaxed text-paper/60 md:col-span-5 md:col-start-8">{c.lede}</p>
      </div>
      <Reveal delay={0.1} className="mt-12 md:mt-16">
        <div className="overflow-hidden rounded-card border border-white/10 bg-[#08080a] shadow-[0_60px_120px_-50px_rgb(0_0_0/0.95)]">
          {/* the window's bar */}
          <div className="flex h-10 items-center gap-2 border-b border-white/[0.06] px-4">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/10" />
            <span className="size-2.5 rounded-full bg-white/[0.07]" />
            <span className="ml-3 truncate rounded-pill bg-white/[0.04] px-3 py-0.5 font-mono text-[11px] text-paper/40">logoless.io/{role === 'brand' ? 'brand' : role === 'developer' ? 'developers/apps' : 'dashboard'}</span>
            <span className="ml-auto rounded-pill border border-white/10 px-2 py-0.5 text-[10px] text-paper/45">Preview</span>
          </div>
          <div className="grid min-h-[420px] md:grid-cols-[200px_1fr]">
            <nav aria-label={`${c.area} preview`} className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2 md:flex-col md:border-r md:border-b-0 md:p-3">
              <p className="hidden px-3 pt-1 pb-3 text-[11px] text-paper/35 md:block">{c.area}</p>
              {TABS[role].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-pressed={tab === t.id}
                  className={cn('relative flex h-10 shrink-0 items-center gap-2.5 rounded-pill px-3.5 text-left text-[14px] transition-colors', tab === t.id ? 'text-paper' : 'text-paper/50 hover:text-paper')}
                >
                  {tab === t.id && <motion.span layoutId={`rp-${role}`} transition={{ type: 'spring', stiffness: 480, damping: 38 }} className="absolute inset-0 rounded-pill bg-white/[0.08]" />}
                  <t.icon aria-hidden="true" className="relative size-4" />
                  <span className="relative whitespace-nowrap">{t.label}</span>
                </button>
              ))}
            </nav>
            <div className="relative min-w-0 p-4 md:p-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE_OUT }}>
                  {role === 'creator' && <CreatorPane tab={tab} go={setTab} />}
                  {role === 'brand' && <BrandPane tab={tab} go={setTab} />}
                  {role === 'developer' && <DeveloperPane tab={tab} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

const card = 'rounded-[calc(20px*var(--round,1))] border border-white/[0.07] bg-white/[0.025] p-4 md:p-5'

function Count({ to, prefix = '', decimals = 0 }: { to: number; prefix?: string; decimals?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 900)
      setV(to * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{prefix}{v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
}

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <div className={card}>
      <p className="text-[12px] text-paper/45">{label}</p>
      <p className="mt-1.5 font-display text-3xl tabular-nums md:text-4xl">{children}</p>
      {note && <p className="mt-1 text-[11px] text-paper/35">{note}</p>}
    </div>
  )
}

function Bars({ values }: { values: number[] }) {
  const max = Math.max(...values)
  return (
    <div className="flex h-28 items-end gap-1.5">
      {values.map((v, n) => (
        <motion.span key={n} initial={{ scaleY: 0 }} animate={{ scaleY: v / max }} transition={{ duration: 0.7, ease: EASE_OUT, delay: n * 0.03 }} className="h-full flex-1 origin-bottom rounded-t-md bg-gradient-to-t from-white/15 to-white/50" />
      ))}
    </div>
  )
}

function CreatorPane({ tab, go }: { tab: string; go: (t: string) => void }) {
  const [balance, setBalance] = useState(148.6)
  const [sent, setSent] = useState(false)
  if (tab === 'clips')
    return (
      <div className={cn(card, 'p-0 md:p-0')}>
        {[
          ['Midnight drive, chorus edit', 'TikTok', '42,180 views', 'Approved'],
          ['Studio session, 15s', 'YouTube', '18,904 views', 'Approved'],
          ['Dance cut, slowed', 'Instagram', 'Checking', 'In review'],
          ['Lyric clip, verse 2', 'TikTok', '-', 'Declined: no sound'],
        ].map(([t, p, v, s]) => (
          <div key={t} className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 last:border-0 md:px-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-panel bg-white/[0.05]"><Clapperboard className="size-4 text-paper/60" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px]">{t}</span>
              <span className="text-[12px] text-paper/40">{p} · {v}</span>
            </span>
            <span className={cn('shrink-0 rounded-pill px-2.5 py-1 text-[11px]', s === 'Approved' ? 'bg-emerald-400/10 text-emerald-300' : s === 'In review' ? 'bg-white/[0.06] text-paper/60' : 'bg-signal/10 text-signal')}>{s}</span>
          </div>
        ))}
      </div>
    )
  if (tab === 'earnings')
    return (
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <div className={card}>
          <p className="text-[12px] text-paper/45">Last 14 days</p>
          <div className="mt-4">
            <Bars values={[3, 5, 4, 8, 6, 9, 12, 10, 14, 11, 16, 13, 18, 21]} />
          </div>
        </div>
        <div className={card}>
          <p className="text-[12px] text-paper/45">Ready to withdraw</p>
          <p className="mt-1.5 font-display text-4xl tabular-nums">${balance.toFixed(2)}</p>
          <button
            type="button"
            disabled={sent || balance < 10}
            onClick={() => {
              setSent(true)
              window.setTimeout(() => setBalance(0), 500)
            }}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-pill bg-paper text-[14px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-60"
          >
            {sent ? <><Check className="size-4" /> Sent to PayPal</> : 'Withdraw to PayPal'}
          </button>
          <p className="mt-2 text-[11px] text-paper/35">{sent ? 'In a real account it arrives in minutes.' : 'No fees on withdrawals.'}</p>
        </div>
      </div>
    )
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Earned this month"><Count to={312.4} prefix="$" decimals={2} /></Stat>
        <Stat label="Verified views"><Count to={186240} /></Stat>
        <Stat label="Clips approved" note="3 waiting for a look"><Count to={14} /></Stat>
      </div>
      <div className={cn(card, 'flex flex-wrap items-center gap-3')}>
        <span className="grid size-10 place-items-center rounded-panel bg-white/[0.05]"><Link2 className="size-4" /></span>
        <span className="min-w-0 flex-1 text-[14px]">
          <span className="block">Link your TikTok to get clips approved faster</span>
          <span className="text-[12px] text-paper/40">Verified accounts are checked automatically</span>
        </span>
        <button type="button" onClick={() => go('clips')} className="h-9 rounded-pill border border-white/15 px-4 text-[13px] transition-colors hover:bg-white/[0.06]">See your clips</button>
      </div>
    </div>
  )
}

function BrandPane({ tab, go }: { tab: string; go: (t: string) => void }) {
  const [queue, setQueue] = useState([
    { id: 1, who: '@nightowl.edits', what: 'Chorus edit, 15s', views: '12.4K' },
    { id: 2, who: '@mara.cuts', what: 'Behind the scenes', views: '3.1K' },
    { id: 3, who: '@loopkid', what: 'Slowed + reverb', views: '27.9K' },
  ])
  const [decided, setDecided] = useState<Record<number, 'ok' | 'no'>>({})
  const [funds, setFunds] = useState(2450)
  const [add, setAdd] = useState(500)
  if (tab === 'review')
    return (
      <div className="grid gap-2.5">
        <AnimatePresence initial={false}>
          {queue.map((q) => (
            <motion.div key={q.id} layout exit={{ opacity: 0, x: decided[q.id] === 'no' ? -30 : 30, transition: { duration: 0.25 } }} className={cn(card, 'flex items-center gap-3 py-3 md:py-3.5')}>
              <span className="grid size-10 shrink-0 place-items-center rounded-panel bg-white/[0.05]"><Clapperboard className="size-4 text-paper/60" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{q.what}</span>
                <span className="text-[12px] text-paper/40">{q.who} · {q.views} views</span>
              </span>
              <button type="button" aria-label={`Decline ${q.what}`} onClick={() => (setDecided((d) => ({ ...d, [q.id]: 'no' })), setQueue((l) => l.filter((x) => x.id !== q.id)))} className="grid size-9 place-items-center rounded-pill border border-white/10 text-paper/60 transition-colors hover:border-signal/50 hover:text-signal"><X className="size-4" /></button>
              <button type="button" aria-label={`Approve ${q.what}`} onClick={() => (setDecided((d) => ({ ...d, [q.id]: 'ok' })), setQueue((l) => l.filter((x) => x.id !== q.id)))} className="grid size-9 place-items-center rounded-pill bg-paper text-ink transition-colors hover:bg-paper/85"><Check className="size-4" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
        {queue.length === 0 && (
          <div className={cn(card, 'py-10 text-center')}>
            <p className="font-display text-2xl">All caught up</p>
            <p className="mt-1 text-[13px] text-paper/45">{Object.values(decided).filter((d) => d === 'ok').length} approved, {Object.values(decided).filter((d) => d === 'no').length} declined. Creators are told why.</p>
          </div>
        )}
      </div>
    )
  if (tab === 'balance')
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className={card}>
          <p className="text-[12px] text-paper/45">Balance</p>
          <p className="mt-1.5 font-display text-4xl tabular-nums">${funds.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-paper/35">Unspent money can always be withdrawn</p>
        </div>
        <div className={card}>
          <label className="text-[12px] text-paper/45" htmlFor="rp-add">Add funds: ${add}</label>
          <input id="rp-add" type="range" min={100} max={5000} step={100} value={add} onChange={(e) => setAdd(Number(e.target.value))} className="mt-3 w-full accent-white" />
          <button type="button" onClick={() => setFunds((f) => f + add)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-pill bg-paper text-[14px] font-medium text-ink transition-colors hover:bg-paper/85">
            <Plus className="size-4" /> Add ${add}
          </button>
        </div>
      </div>
    )
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Views bought"><Count to={1240000} /></Stat>
        <Stat label="Clips posted"><Count to={318} /></Stat>
        <Stat label="Cost per 1K views" note="You set the rate"><Count to={1.5} prefix="$" decimals={2} /></Stat>
      </div>
      <div className={card}>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[14px]"><Megaphone className="size-4 text-paper/60" /> Midnight Drive, single launch</span>
          <span className="rounded-pill bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Live</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-pill bg-white/[0.06]">
          <motion.div initial={{ width: 0 }} animate={{ width: '62%' }} transition={{ duration: 1, ease: EASE_OUT }} className="h-full rounded-pill bg-paper/80" />
        </div>
        <p className="mt-2 text-[12px] text-paper/40">62% of the budget used · {queue.length} clips waiting</p>
        <button type="button" onClick={() => go('review')} className="mt-4 h-9 rounded-pill border border-white/15 px-4 text-[13px] transition-colors hover:bg-white/[0.06]">Review clips</button>
      </div>
    </div>
  )
}

function DeveloperPane({ tab }: { tab: string }) {
  const [copied, setCopied] = useState(false)
  const id = 'lgc_7f3a92e1c4'
  if (tab === 'consent')
    return (
      <div className="mx-auto max-w-sm rounded-card border border-white/10 bg-[#0d0d10] p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.06]"><Code2 className="size-5" /></span>
        <p className="mt-4 font-display text-2xl">Beatgrid wants to sign you in</p>
        <ul className="mt-5 grid gap-2 text-left text-[13px] text-paper/70">
          {['Your name, @handle and picture', 'Your email address', 'Your clip count and verified views'].map((x) => (
            <li key={x} className="flex items-center gap-2"><Check className="size-3.5 text-emerald-300" /> {x}</li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <span className="grid h-10 place-items-center rounded-pill border border-white/15 text-[13px]">Cancel</span>
          <span className="grid h-10 place-items-center rounded-pill bg-paper text-[13px] font-medium text-ink">Allow</span>
        </div>
      </div>
    )
  if (tab === 'stats')
    return (
      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <div className={card}>
          <p className="text-[12px] text-paper/45">Sign-ins, last 14 days</p>
          <div className="mt-4"><Bars values={[2, 4, 3, 6, 9, 7, 11, 10, 15, 13, 17, 16, 22, 25]} /></div>
        </div>
        <div className="grid gap-4">
          <Stat label="People signed in"><Count to={1284} /></Stat>
          <Stat label="Approval rate"><Count to={94} />%</Stat>
        </div>
      </div>
    )
  return (
    <div className="grid gap-4">
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-panel bg-white/[0.05]"><Code2 className="size-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px]">Beatgrid</span>
            <span className="text-[12px] text-paper/40">Server app · https://beatgrid.app/auth/logoless/callback</span>
          </span>
          <span className="rounded-pill bg-emerald-400/10 px-2.5 py-1 text-[11px] text-emerald-300">Verified</span>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-panel border border-white/[0.07] bg-black/40 px-3 py-2 font-mono text-[12px]">
          <span className="text-paper/40">client_id</span>
          <span className="min-w-0 flex-1 truncate">{id}</span>
          <button type="button" onClick={() => (void navigator.clipboard?.writeText(id).catch(() => {}), setCopied(true), window.setTimeout(() => setCopied(false), 1400))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-paper/60 transition-colors hover:bg-white/[0.06] hover:text-paper">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      <div className={cn(card, 'border-dashed text-center text-[13px] text-paper/45')}>
        <Plus className="mx-auto mb-1.5 size-4" /> Register another app
      </div>
    </div>
  )
}
