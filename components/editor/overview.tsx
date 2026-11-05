'use client'

import { ArrowRight, Check, Copy, ExternalLink, ImageIcon, LayoutGrid, Link2, MousePointer2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import type { BioPageData } from '@/components/bio/context'
import { DEFAULT_BIO } from '@/lib/bio'
import { cn } from '@/lib/utils'
import type { DashId } from './dashboard'
import type { EditorApi } from './types'

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '0%')
const n = (v: number) => v.toLocaleString('en-US')

const card = 'rounded-[28px] border border-[var(--ed-line)] bg-[#0d0d0d] shadow-[var(--ed-lift)]'

/** The first page of the dashboard: where your page lives, what is left to set up, and how it is doing. */
export function OverviewPanel({ api, data, go, onTour }: { api: EditorApi; data: BioPageData; go: (id: DashId) => void; onTour: () => void }) {
  const { cfg, profile, stats } = api
  const [copied, setCopied] = useState(false)
  const url = `logoless.io/${profile.handle}`
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${url}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  const first = profile.name || profile.handle || 'there'
  const links = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'social' || b.t === 'video')
  const real = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'video')

  const steps: { id: string; text: string; done: boolean; go: () => void; cta: string }[] = [
    { id: 'name', text: 'Add your name and a short bio', done: Boolean(profile.name && profile.bio), go: () => go('profile'), cta: 'Profile' },
    { id: 'pic', text: 'Add a picture', done: Boolean(profile.hasAvatar || profile.newAvatar), go: () => go('profile'), cta: 'Profile' },
    { id: 'link', text: 'Add your first link', done: real.length > 0, go: () => go('links'), cta: 'Links' },
    { id: 'look', text: 'Pick a layout and a look', done: cfg.layout !== DEFAULT_BIO.layout || cfg.bg.kind !== DEFAULT_BIO.bg.kind, go: () => go('layout'), cta: 'Layout' },
    { id: 'share', text: 'Put your link in your bio', done: stats.views > 0, go: copy, cta: 'Copy link' },
  ]
  const left = steps.filter((s) => !s.done)

  const today = stats.days[stats.days.length - 1]
  const max = Math.max(1, ...stats.days.map((d) => d.views))
  const top = links
    .map((b) => ({ b, c: stats.links[b.id] ?? 0 }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 5)
  const topMax = Math.max(1, ...top.map((t) => t.c))
  const fmt = (d: string) => `${d.slice(4, 6)}/${d.slice(6)}`

  const figures = [
    { label: 'Views', value: n(stats.views), note: `${n(today?.views ?? 0)} today` },
    { label: 'Clicks', value: n(stats.clicks), note: `${n(today?.clicks ?? 0)} today` },
    { label: 'On your page', value: n(links.length), note: `${real.length} ${real.length === 1 ? 'link' : 'links'}, ${links.length - real.length} socials` },
    { label: 'Click rate', value: pct(stats.clicks, stats.views), note: 'Clicks for every view' },
  ]
  const actions: [string, DashId, typeof Link2][] = [
    ['Add a link', 'links', Link2],
    ['Change the layout', 'layout', LayoutGrid],
    ['Pick a background', 'background', ImageIcon],
    ['Choose a cursor', 'cursor', MousePointer2],
    ['Turn on effects', 'effects', Sparkles],
  ]

  return (
    <div className="ed-scroll h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-12">
        <header className="rise flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="disp text-[clamp(1.9rem,3.2vw,2.6rem)]">Welcome back, {first}</h1>
            <p className="mt-2 text-[0.84rem] text-[var(--ed-mute)]">Here is how your page is doing.</p>
          </div>
          <button type="button" onClick={onTour} className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ed-line2)] px-5 text-[0.8rem] text-white/75 transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.06] hover:text-white">
            <Sparkles className="size-3.5" /> Take the tour again
          </button>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="min-w-0 space-y-6">
            {/* where your page lives */}
            <section aria-label="Your page" className={cn(card, 'rise p-6 md:p-7')} style={{ '--d': '0.05s' } as React.CSSProperties}>
              <p className="text-[0.78rem] text-[var(--ed-mute)]">Your page</p>
              <p className="mt-2 truncate text-[clamp(1.1rem,2.4vw,1.6rem)] tracking-[-0.01em]">{url}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#ececec] px-5 text-[0.8rem] font-medium text-[#0a0a0a] transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-white">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'Copied' : 'Copy link'}
                </button>
                <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ed-line2)] px-5 text-[0.8rem] transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.06]">
                  <ExternalLink className="size-3.5" /> Open it
                </a>
                <button type="button" onClick={() => go('profile')} className="inline-flex h-10 items-center rounded-full px-4 text-[0.8rem] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
                  Change address
                </button>
              </div>
            </section>

            {/* the numbers */}
            <section aria-label="Numbers" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {figures.map((f, i) => (
                <div key={f.label} className={cn(card, 'rise p-6')} style={{ '--d': `${0.1 + i * 0.05}s` } as React.CSSProperties}>
                  <p className="text-[0.78rem] text-[var(--ed-mute)]">{f.label}</p>
                  <p className="disp mt-4 text-[clamp(2rem,3vw,2.6rem)] tabular-nums">{f.value}</p>
                  <p className="mt-3 text-[0.74rem] text-[var(--ed-dim)]">{f.note}</p>
                </div>
              ))}
            </section>

            {/* what is left */}
            {left.length > 0 && (
              <section aria-label="Set up" className={cn(card, 'rise overflow-hidden')} style={{ '--d': '0.3s' } as React.CSSProperties}>
                <div className="flex items-center justify-between gap-4 px-6 py-5">
                  <h2 className="text-[0.95rem] font-medium">Get set up</h2>
                  <span className="text-[0.76rem] text-[var(--ed-mute)] tabular-nums">
                    {steps.length - left.length} of {steps.length}
                  </span>
                </div>
                <div aria-hidden="true" className="mx-6 h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-[#ececec] transition-[width] duration-500 ease-out" style={{ width: `${((steps.length - left.length) / steps.length) * 100}%` }} />
                </div>
                <ul className="mt-3 pb-2">
                  {steps.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={s.go} disabled={s.done} className={cn('group flex w-full items-center gap-4 rounded-none px-6 py-3.5 text-left text-[0.84rem] transition-colors duration-200', s.done ? 'text-white/40' : 'hover:bg-white/[0.04]')}>
                        <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center rounded-full border transition-colors', s.done ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-white/30')}>
                          {s.done && <Check className="size-3" strokeWidth={2.5} />}
                        </span>
                        <span className={cn('flex-1', s.done && 'line-through decoration-white/30')}>{s.text}</span>
                        {!s.done && (
                          <span className="inline-flex items-center gap-1.5 text-[0.76rem] text-white/45 transition-colors group-hover:text-white">
                            {s.cta} <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-label="Views by day" className={cn(card, 'rise p-6 md:p-7')} style={{ '--d': '0.35s' } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <h2 className="text-[0.95rem] font-medium">Views, last 30 days</h2>
                <button type="button" onClick={() => go('insights')} className="rounded-full px-3 py-1.5 text-[0.76rem] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
                  All insights
                </button>
              </div>
              <div className="mt-6 flex h-32 items-end gap-[3px]" role="img" aria-label="Views per day">
                {stats.days.map((d) => (
                  <span key={d.day} title={`${fmt(d.day)}: ${d.views} views`} className="flex-1 rounded-t-sm bg-[#ececec] transition-opacity duration-200 hover:opacity-100" style={{ height: `${Math.max(3, (d.views / max) * 100)}%`, opacity: d.views ? 0.85 : 0.18 }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[0.66rem] text-[var(--ed-dim)] tabular-nums">
                <span>{stats.days[0] ? fmt(stats.days[0].day) : ''}</span>
                <span>{today ? fmt(today.day) : ''}</span>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section aria-label="Top links" className={cn(card, 'rise p-6')} style={{ '--d': '0.4s' } as React.CSSProperties}>
                <h2 className="text-[0.95rem] font-medium">Top links</h2>
                {top.length === 0 ? (
                  <p className="mt-5 text-[0.82rem] leading-[1.7] text-[var(--ed-mute)]">
                    Nothing here yet.{' '}
                    <button type="button" onClick={() => go('links')} className="text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white">
                      Add your first link
                    </button>
                    .
                  </p>
                ) : (
                  <ul className="mt-3">
                    {top.map(({ b, c }) => (
                      <li key={b.id} className="border-b border-[var(--ed-line)] py-3.5 last:border-b-0">
                        <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
                          <span className="min-w-0 truncate">{b.t === 'link' || b.t === 'video' ? b.title || b.url : b.t === 'social' ? b.platform : ''}</span>
                          <span className="tabular-nums text-[var(--ed-mute)]">{n(c)}</span>
                        </div>
                        <span aria-hidden="true" className="mt-2.5 block h-1 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full bg-white/70" style={{ width: `${(c / topMax) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-label="Quick actions" className={cn(card, 'rise p-6')} style={{ '--d': '0.45s' } as React.CSSProperties}>
                <h2 className="text-[0.95rem] font-medium">Quick actions</h2>
                <ul className="mt-4 grid gap-2">
                  {actions.map(([label, id, Icon]) => (
                    <li key={id}>
                      <button type="button" onClick={() => go(id)} className="group flex h-11 w-full items-center gap-3 rounded-full border border-[var(--ed-line)] px-4 text-left text-[0.82rem] transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/25 hover:bg-white/[0.05]">
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-white/70" strokeWidth={1.6} />
                        <span className="flex-1">{label}</span>
                        <ArrowRight aria-hidden="true" className="size-3.5 opacity-40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* how it looks right now */}
          <aside aria-label="Preview" className="hidden xl:block">
            <div className="sticky top-8">
              <p className="mb-3 text-[0.78rem] text-[var(--ed-mute)]">How it looks</p>
              <div aria-hidden="true" className="relative h-[27rem] w-[270px] overflow-hidden rounded-[2rem] border border-[var(--ed-line2)] bg-black shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]">
                <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${270 / 390})` }}>
                  <BioPage mode="mini" data={data} />
                </div>
              </div>
              <button type="button" onClick={() => go('layout')} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.78rem] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white">
                Change it <ArrowRight className="size-3.5" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
