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
  const first = (profile.name || profile.handle || 'there').split(' ')[0].toLowerCase()
  const links = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'social' || b.t === 'video')
  const real = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'video')

  const steps: { id: string; text: string; done: boolean; go: () => void; cta: string }[] = [
    { id: 'name', text: 'add your name and a short bio', done: Boolean(profile.name && profile.bio), go: () => go('profile'), cta: 'profile' },
    { id: 'pic', text: 'add a picture', done: Boolean(profile.hasAvatar || profile.newAvatar), go: () => go('profile'), cta: 'profile' },
    { id: 'link', text: 'add your first link', done: real.length > 0, go: () => go('links'), cta: 'links' },
    { id: 'look', text: 'pick a layout and a look', done: cfg.layout !== DEFAULT_BIO.layout || cfg.bg.kind !== DEFAULT_BIO.bg.kind, go: () => go('layout'), cta: 'layout' },
    { id: 'share', text: 'put your link in your bio', done: stats.views > 0, go: copy, cta: 'copy link' },
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
    { label: 'views', value: n(stats.views), note: `${n(today?.views ?? 0)} today` },
    { label: 'clicks', value: n(stats.clicks), note: `${n(today?.clicks ?? 0)} today` },
    { label: 'on your page', value: n(links.length), note: `${real.length} ${real.length === 1 ? 'link' : 'links'}, ${links.length - real.length} socials` },
    { label: 'click rate', value: pct(stats.clicks, stats.views), note: 'clicks for every view' },
  ]
  const actions: [string, DashId, typeof Link2][] = [
    ['add a link', 'links', Link2],
    ['change the layout', 'layout', LayoutGrid],
    ['pick a background', 'background', ImageIcon],
    ['choose a cursor', 'cursor', MousePointer2],
    ['turn on effects', 'effects', Sparkles],
  ]

  return (
    <div className="ed-scroll h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-12">
        <header className="border-b border-[var(--ed-line)] pb-8">
          <h1 className="disp text-[clamp(2.2rem,4.6vw,3.8rem)]">welcome back, {first}</h1>
          <p className="mt-4 max-w-md text-[0.8rem] leading-[1.7] text-[var(--ed-mute)]">how your page is doing, and what is left to set up.</p>
          <button type="button" onClick={onTour} className="cap mt-5 inline-flex h-9 items-center gap-2 border border-[var(--ed-line2)] px-4 text-white/70 transition-colors hover:bg-white hover:text-black">
            <Sparkles className="size-3.5" /> take the tour again
          </button>
        </header>

        <div className="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
          <div className="min-w-0 space-y-14">
            {/* where your page lives */}
            <section aria-label="your page" className="border border-[var(--ed-line2)] p-5 md:p-6">
              <p className="cap text-[var(--ed-mute)]">your page</p>
              <p className="mt-3 truncate text-[clamp(1.1rem,2.6vw,1.7rem)] tracking-[-0.01em]">{url}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="cap inline-flex h-9 items-center gap-2 bg-white px-4 text-black transition-opacity hover:opacity-85">
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? 'copied' : 'copy link'}
                </button>
                <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="cap inline-flex h-9 items-center gap-2 border border-[var(--ed-line2)] px-4 transition-colors hover:bg-white/10">
                  <ExternalLink className="size-3.5" /> open it
                </a>
                <button type="button" onClick={() => go('profile')} className="cap inline-flex h-9 items-center px-3 text-white/55 transition-colors hover:text-white">
                  change address
                </button>
              </div>
            </section>

            {/* what is left */}
            {left.length > 0 && (
              <section aria-label="set up" className="border border-[var(--ed-line)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--ed-line)] px-5 py-4">
                  <h2 className="text-[0.95rem]">get set up</h2>
                  <span className="text-[0.74rem] text-[var(--ed-mute)] tabular-nums">
                    {steps.length - left.length} of {steps.length}
                  </span>
                </div>
                <div aria-hidden="true" className="h-[2px] bg-white/10">
                  <span className="block h-full bg-white transition-all duration-500" style={{ width: `${((steps.length - left.length) / steps.length) * 100}%` }} />
                </div>
                <ul>
                  {steps.map((s) => (
                    <li key={s.id} className="border-b border-[var(--ed-line)] last:border-b-0">
                      <button type="button" onClick={s.go} disabled={s.done} className={cn('group flex w-full items-center gap-4 px-5 py-3.5 text-left text-[0.82rem] transition-colors', s.done ? 'text-white/40' : 'hover:bg-white/[0.04]')}>
                        <span aria-hidden="true" className={cn('grid size-5 shrink-0 place-items-center border', s.done ? 'border-white bg-white text-black' : 'border-white/40')}>
                          {s.done && <Check className="size-3" strokeWidth={2.5} />}
                        </span>
                        <span className={cn('flex-1', s.done && 'line-through decoration-white/30')}>{s.text}</span>
                        {!s.done && (
                          <span className="cap inline-flex items-center gap-1.5 text-white/45 transition-colors group-hover:text-white">
                            {s.cta} <ArrowRight className="size-3.5" />
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* the numbers */}
            <section aria-label="numbers" className="grid gap-x-8 gap-y-10 sm:grid-cols-2 2xl:grid-cols-4">
              {figures.map((f) => (
                <div key={f.label} className="border-t border-[var(--ed-line2)] pt-4">
                  <p className="text-[0.76rem] text-[var(--ed-mute)]">{f.label}</p>
                  <p className="disp mt-5 text-[clamp(2.4rem,4vw,3.6rem)] tabular-nums">{f.value}</p>
                  <p className="mt-4 text-[0.74rem] text-[var(--ed-dim)]">{f.note}</p>
                </div>
              ))}
            </section>

            <section aria-label="views by day">
              <div className="flex items-end justify-between border-b border-[var(--ed-line)] pb-3">
                <h2 className="text-[0.95rem]">views, last 30 days</h2>
                <button type="button" onClick={() => go('insights')} className="cap text-white/55 transition-colors hover:text-white">
                  all insights
                </button>
              </div>
              <div className="mt-6 flex h-32 items-end gap-[3px]" role="img" aria-label="views per day">
                {stats.days.map((d) => (
                  <span key={d.day} title={`${fmt(d.day)}: ${d.views} views`} className="flex-1 bg-white/80 transition-colors hover:bg-white" style={{ height: `${Math.max(3, (d.views / max) * 100)}%`, opacity: d.views ? 1 : 0.2 }} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[0.64rem] text-[var(--ed-dim)] tabular-nums">
                <span>{stats.days[0] ? fmt(stats.days[0].day) : ''}</span>
                <span>{today ? fmt(today.day) : ''}</span>
              </div>
            </section>

            <div className="grid gap-12 lg:grid-cols-2">
              <section aria-label="top links">
                <h2 className="border-b border-[var(--ed-line)] pb-3 text-[0.95rem]">top links</h2>
                {top.length === 0 ? (
                  <p className="mt-5 text-[0.8rem] leading-[1.7] text-[var(--ed-mute)]">
                    nothing here yet.{' '}
                    <button type="button" onClick={() => go('links')} className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                      add your first link
                    </button>
                    .
                  </p>
                ) : (
                  <ul>
                    {top.map(({ b, c }) => (
                      <li key={b.id} className="border-b border-[var(--ed-line)] py-3.5">
                        <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
                          <span className="min-w-0 truncate">{b.t === 'link' || b.t === 'video' ? b.title || b.url : b.t === 'social' ? b.platform : ''}</span>
                          <span className="tabular-nums text-[var(--ed-mute)]">{n(c)}</span>
                        </div>
                        <span aria-hidden="true" className="mt-2.5 block h-[2px] bg-white/10">
                          <span className="block h-full bg-white/70" style={{ width: `${(c / topMax) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-label="quick actions">
                <h2 className="border-b border-[var(--ed-line)] pb-3 text-[0.95rem]">quick actions</h2>
                <ul className="mt-4 grid gap-2">
                  {actions.map(([label, id, Icon]) => (
                    <li key={id}>
                      <button type="button" onClick={() => go(id)} className="group flex h-11 w-full items-center gap-3 border border-[var(--ed-line)] px-4 text-left text-[0.8rem] transition-colors hover:bg-white hover:text-black">
                        <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
                        <span className="flex-1">{label}</span>
                        <ArrowRight aria-hidden="true" className="size-3.5 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* how it looks right now */}
          <aside aria-label="preview" className="hidden xl:block">
            <div className="sticky top-8">
              <p className="cap mb-3 text-[var(--ed-mute)]">how it looks</p>
              <div aria-hidden="true" className="relative h-[27rem] w-[270px] overflow-hidden border border-[var(--ed-line2)] bg-black">
                <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${270 / 390})` }}>
                  <BioPage mode="mini" data={data} />
                </div>
              </div>
              <button type="button" onClick={() => go('layout')} className="cap mt-3 inline-flex items-center gap-1.5 text-white/55 transition-colors hover:text-white">
                change it <ArrowRight className="size-3.5" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
