'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ActionLink } from './action-link'
import { VerifyCard } from './verify-card'
import type { SetupStep } from '@/lib/setup-steps'

const FLOW = {
  creator: ['Find a campaign', 'Post your content', 'Paste the link', 'Get paid'],
  brand: ['Add funds', 'Write a brief', 'We read it and it goes live', 'Creators post and earn'],
}

/**
 * One thing at a time. The step to do next is big, with its button right there. The rest wait in a short list that opens
 * when you press it, and finished steps tuck away at the bottom.
 */
export function SetupSteps({ steps, email, kind = 'creator' }: { steps: SetupStep[]; email: string; kind?: 'creator' | 'brand' }) {
  const todo = steps.filter((s) => !s.done)
  const done = steps.filter((s) => s.done)
  // the step to do next is the first one that is needed; optional ones wait at the end
  const next = todo.find((s) => !s.optional)
  const rest = todo.filter((s) => s !== next)
  const [open, setOpen] = useState<string | null>(null)
  const [showWhy, setShowWhy] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const number = (id: string) => steps.findIndex((s) => s.id === id) + 1

  return (
    <div className="max-w-2xl">
      {/* where you are */}
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-5xl leading-none tracking-[-0.04em] tabular-nums">
          {done.filter((s) => !s.optional).length}
          <span className="text-paper/35"> / {steps.filter((s) => !s.optional).length}</span>
        </p>
        <p className="text-[15px] text-paper/50">{next ? 'done so far' : 'all done'}</p>
      </div>
      <div className="mt-4 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done.length} aria-label="Steps done">
        {steps.map((s) => (
          <span key={s.id} className={cn('h-1.5 flex-1 rounded-pill transition-colors duration-500', s.done ? 'bg-paper' : 'bg-white/12')} />
        ))}
      </div>

      {/* the one thing to do now */}
      {next ? (
        <section aria-label="Up next" className="mt-10 rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03] p-7 md:p-9">
          <p className="text-[13px] text-paper/50">Up next · step {number(next.id)}</p>
          <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.035em] md:text-[2.6rem]">{next.title}</h2>
          <p className="mt-3 text-[17px] leading-snug text-paper/65">{next.short}</p>
          <ol className="mt-5 grid gap-2 text-[15px] text-paper/70">
            {next.how.map((h, n) => (
              <li key={h} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-pill border border-line-strong text-xs text-paper/55 tabular-nums">{n + 1}</span>
                <span className="pt-px">{h}</span>
              </li>
            ))}
          </ol>
          {next.id === 'verify' ? (
            <VerifyCard email={email} />
          ) : (
            next.href && (
              <div className="mt-6">
                <ActionLink href={next.href}>{next.cta}</ActionLink>
              </div>
            )
          )}
          <button type="button" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy} className="mt-6 inline-flex items-center gap-1.5 text-sm text-paper/50 transition-colors hover:text-paper">
            Why this matters <ChevronDown className={cn('size-4 transition-transform', showWhy && 'rotate-180')} aria-hidden="true" />
          </button>
          {showWhy && <p className="mt-3 text-[15px] leading-relaxed text-paper/60">{next.why}</p>}
        </section>
      ) : (
        <section aria-label="All set" className="mt-10 rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03] p-7 md:p-9">
          <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.035em]">You are all set.</h2>
          <p className="mt-3 text-[17px] text-paper/65">{kind === 'brand' ? 'Everything is in place. Start a campaign whenever you are ready.' : 'Everything is in place. Find a campaign and keep creating.'}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {kind === 'brand' ? (
              <>
                <ActionLink href="/brand/campaigns/new">New campaign</ActionLink>
                <ActionLink href="/brand/balance" variant="ghost">
                  Balance
                </ActionLink>
              </>
            ) : (
              <>
                <ActionLink href="/">Find a campaign</ActionLink>
                <ActionLink href="/dashboard/earnings" variant="ghost">
                  See earnings
                </ActionLink>
              </>
            )}
          </div>
        </section>
      )}

      {/* still to do */}
      {rest.length > 0 && (
        <section aria-label="Still to do" className="mt-10">
          <h3 className="mb-1 text-[13px] text-paper/50">Then</h3>
          <ul className="divide-y divide-line border-y border-line">
            {rest.map((s) => {
              const isOpen = open === s.id
              return (
                <li key={s.id}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen} className="group flex w-full items-center gap-4 py-4 text-left">
                    <span className="grid size-8 shrink-0 place-items-center rounded-pill border border-line-strong text-xs text-paper/50 tabular-nums">{number(s.id)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px]">
                        {s.title}
                        {s.optional && <span className="ml-2 text-xs text-paper/40">optional</span>}
                      </span>
                      <span className="block truncate text-sm text-paper/45">{s.short}</span>
                    </span>
                    <ChevronDown className={cn('size-4 shrink-0 text-paper/40 transition-transform group-hover:text-paper', isOpen && 'rotate-180')} aria-hidden="true" />
                  </button>
                  {isOpen && (
                    <div className="pr-2 pb-5 pl-12">
                      <p className="text-[15px] leading-relaxed text-paper/60">{s.why}</p>
                      <ol className="mt-4 grid gap-1.5 text-[15px] text-paper/70">
                        {s.how.map((h, n) => (
                          <li key={h} className="flex gap-3">
                            <span className="grid size-6 shrink-0 place-items-center rounded-pill border border-line-strong text-xs text-paper/55 tabular-nums">{n + 1}</span>
                            <span className="pt-px">{h}</span>
                          </li>
                        ))}
                      </ol>
                      {s.href && (
                        <div className="mt-4">
                          <ActionLink href={s.href} variant="ghost">
                            {s.cta}
                          </ActionLink>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* finished */}
      {done.length > 0 && (
        <section aria-label="Done" className="mt-8">
          <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className="inline-flex items-center gap-2 text-sm text-paper/50 transition-colors hover:text-paper">
            <Check className="size-4" aria-hidden="true" /> {done.length} done <ChevronDown className={cn('size-4 transition-transform', showDone && 'rotate-180')} aria-hidden="true" />
          </button>
          {showDone && (
            <ul className="mt-3 grid gap-1">
              {done.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-1.5 text-[15px] text-paper/55">
                  <span className="grid size-6 place-items-center rounded-pill bg-paper text-ink">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="flex-1">{s.title}</span>
                  {s.href && (
                    <a href={s.href} className="text-sm underline underline-offset-4 hover:text-paper">
                      Open
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* the whole journey, in one line */}
      <p className="mt-14 border-t border-line pt-6 text-sm text-paper/40">
        <span className="text-paper/55">How it works:</span> {FLOW[kind].join('  →  ')}
      </p>
    </div>
  )
}
