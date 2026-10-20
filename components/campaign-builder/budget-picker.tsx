'use client'

import { motion } from 'framer-motion'
import { Eye, Gauge } from 'lucide-react'
import { useId } from 'react'
import { Chip, Label } from '@/components/invite/bits'
import { budgetPlan, type BudgetMode, RATE_MAX, RATE_MIN } from '@/lib/campaign-extras-shared'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { LiveNumber } from './live-number'

export type BudgetValue = { budget: string; mode: BudgetMode; rate: string; views: string }

const usd = (n: number, digits = 0) => `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
const BUDGETS = [100, 250, 500, 1000, 2500, 5000]
const RATES = [1, 1.5, 2, 3, 5]
const VIEW_GOALS = [50_000, 100_000, 250_000, 500_000, 1_000_000]
const short = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1000}K`)
const digits = (v: string) => v.replace(/[^\d]/g, '')

/** A number typed straight into a sentence: big, underlined, as wide as what is in it. */
function InlineNumber({ value, onChange, prefix, label, decimal, width }: { value: string; onChange: (v: string) => void; prefix?: string; label: string; decimal?: boolean; width: number }) {
  const id = useId()
  const shown = decimal ? value : value ? Number(value).toLocaleString('en-US') : ''
  return (
    <span className="relative inline-flex items-baseline border-b-2 border-line-strong pb-0.5 align-baseline transition-colors focus-within:border-paper">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {prefix && <span className="text-mute">{prefix}</span>}
      <input
        id={id}
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={shown}
        onChange={(e) => onChange(decimal ? e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 6) : digits(e.target.value).slice(0, 9))}
        style={{ width: `${Math.max(width, (shown.length || 1) + 0.6)}ch` }}
        className="bg-transparent tabular-nums outline-none"
      />
    </span>
  )
}

/**
 * The budget, set either way round: "I want 250,000 views for $500" or "$500 at $2 per 1,000 views". The other number is worked
 * out live, with the fee and the total, and anything creators could not be paid is explained in plain words.
 */
export function BudgetPicker({ value, onChange, minBudget = SITE.minCampaignBudgetUsd }: { value: BudgetValue; onChange: (patch: Partial<BudgetValue>) => void; minBudget?: number }) {
  const budget = Number(value.budget) || 0
  const plan = budgetPlan(value.mode, budget, Number(value.rate) || 0, Number(value.views) || 0)
  const budgetErr = value.budget && (budget < minBudget || budget > SITE.maxTopUpUsd * 10) ? `Between ${usd(minBudget)} and ${usd(SITE.maxTopUpUsd * 10)}.` : ''
  const fee = (budget * SITE.platformFeePct) / 100
  const ok = !plan.problem && !budgetErr

  // switching keeps the numbers in step, so the other sentence opens on the same plan
  const switchTo = (mode: BudgetMode) => {
    if (mode === value.mode) return
    if (mode === 'rate') onChange({ mode, rate: plan.rate >= RATE_MIN && plan.rate <= RATE_MAX ? String(plan.rate) : value.rate || '2' })
    else onChange({ mode, views: plan.views > 0 ? String(Math.round(plan.views / 1000) * 1000) : value.views || '250000' })
  }

  return (
    <div className="grid gap-7">
      <div role="radiogroup" aria-label="How do you want to set the budget?" className="grid gap-2 sm:grid-cols-2">
        {([
          { id: 'views', icon: Eye, t: 'I want a number of views', d: 'Say how many views and what you will spend. We work out the rate.' },
          { id: 'rate', icon: Gauge, t: 'I want to set the rate', d: 'Say what you spend and what creators earn per 1,000 views.' },
        ] as const).map((o) => {
          const on = value.mode === o.id
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => switchTo(o.id)} className={cn('relative flex items-start gap-3 rounded-3xl border p-4 text-left transition-colors', on ? 'border-paper bg-white/[0.07]' : 'border-line-strong text-mute hover:border-paper/50 hover:text-paper')}>
              <o.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span>
                <span className="block text-[15px] text-paper">{o.t}</span>
                <span className="mt-0.5 block text-sm leading-snug text-mute">{o.d}</span>
              </span>
            </button>
          )
        })}
      </div>

      <motion.p key={value.mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-display text-[clamp(1.6rem,5.2vw,2.7rem)] leading-[1.35]">
        {value.mode === 'views' ? (
          <>
            I want <InlineNumber label="Views" value={value.views} onChange={(v) => onChange({ views: v })} width={6} /> views for <InlineNumber label="Budget in dollars" prefix="$" value={value.budget} onChange={(v) => onChange({ budget: v })} width={4} />
          </>
        ) : (
          <>
            <InlineNumber label="Budget in dollars" prefix="$" value={value.budget} onChange={(v) => onChange({ budget: v })} width={4} /> at <InlineNumber label="Dollars per 1,000 views" prefix="$" decimal value={value.rate} onChange={(v) => onChange({ rate: v })} width={3} /> per 1,000 views
          </>
        )}
      </motion.p>

      <div className="grid gap-4">
        <div>
          <Label hint={`Minimum ${usd(minBudget)}`}>Budget</Label>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.filter((b) => b >= minBudget).map((b) => (
              <Chip key={b} on={budget === b} onClick={() => onChange({ budget: String(b) })}>
                {usd(b)}
              </Chip>
            ))}
          </div>
          {budgetErr && <p className="mt-2 text-sm text-signal">{budgetErr}</p>}
        </div>
        {value.mode === 'views' ? (
          <div>
            <Label>Views you want</Label>
            <div className="flex flex-wrap gap-2">
              {VIEW_GOALS.map((v) => (
                <Chip key={v} on={Number(value.views) === v} onClick={() => onChange({ views: String(v) })}>
                  {short(v)}
                </Chip>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <Label hint="USD per 1,000 views">What creators earn</Label>
            <div className="flex flex-wrap gap-2">
              {RATES.map((r) => (
                <Chip key={r} on={Number(value.rate) === r} onClick={() => onChange({ rate: String(r) })}>
                  {usd(r, r % 1 ? 2 : 0)} / 1K
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div aria-live="polite" className={cn('relative overflow-hidden rounded-[calc(2rem*var(--round,1))] border p-6 transition-colors md:p-8', ok ? 'border-line-strong bg-white/[0.04]' : 'border-amber-400/30 bg-amber-400/[0.05]')}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs tracking-wide text-mute">{value.mode === 'views' ? 'Creators earn' : 'Your budget buys up to'}</p>
            <p className="mt-2 font-display text-5xl leading-none font-medium md:text-6xl">
              {value.mode === 'views' ? <LiveNumber value={plan.rate} format={(n) => usd(n, 2)} /> : <LiveNumber value={plan.views} format={(n) => Math.round(n).toLocaleString('en-US')} />}
            </p>
            <p className="mt-2 text-mute">{value.mode === 'views' ? 'per 1,000 verified views' : 'verified views'}</p>
          </div>
          <dl className="grid content-start gap-2 text-sm">
            {[
              ['Paid to creators', usd(budget, 2)],
              [`Our fee (${SITE.platformFeePct}%, on top)`, usd(fee, 2)],
              ['The most it can cost', usd(budget + fee, 2)],
            ].map(([k, v], i) => (
              <div key={k} className={cn('flex items-baseline justify-between gap-4', i === 2 && 'border-t border-line pt-2 text-paper')}>
                <dt className={i === 2 ? '' : 'text-mute'}>{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-mute">{plan.problem ?? 'Money leaves your balance only as creators earn, for views we verify. Whatever is not spent stays in your balance.'}</p>
      </div>
    </div>
  )
}
