'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { EASE_OUT } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ActionButton, Card } from './ui'

const STEPS = ['Basics', 'Brief', 'Budget', 'Review'] as const
const PLATFORMS = ['tiktok', 'youtube', 'instagram'] as const

export function CampaignWizard() {
  const { navigate } = useTransitions()
  const [step, setStep] = useState(0)
  const [d, setD] = useState({
    title: '',
    type: 'Music',
    cover: '',
    platforms: ['tiktok'] as string[],
    summary: '',
    clipThis: '',
    offLimits: '',
    rate: '2.50',
    budget: '1000',
    endsOn: '',
    approval: 'auto',
  })
  const set = (k: keyof typeof d, v: string | string[]) => setD((s) => ({ ...s, [k]: v }))
  const rate = Number(d.rate) || 0
  const budget = Number(d.budget) || 0
  const maxViews = rate > 0 ? Math.floor((budget / rate) * 1000) : 0
  const valid = [
    d.title.trim() && d.platforms.length > 0,
    d.summary.trim().length >= 20,
    rate > 0 && budget >= SITE.minTopUpUsd,
    true,
  ][step]

  const publish = () => {
    // TODO(backend): POST /api/brand/campaigns, reserve budget from balance, then redirect
    navigate('/brand/campaigns')
  }

  return (
    <div className="grid max-w-4xl gap-6">
      <ol className="grid grid-cols-4 gap-px bg-line rounded-3xl overflow-hidden">
        {STEPS.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2 bg-ink px-3 py-3 text-sm', i === step ? 'text-paper' : 'text-mute')}>
            <span className={cn('grid size-5 place-items-center border font-mono text-[10px]', i < step ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{s}</span>
          </li>
        ))}
      </ol>

      <Card>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="grid gap-5"
          >
            {step === 0 && (
              <>
                <Field label="Campaign name">
                  <Input value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Red Room" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Type">
                    <Select value={d.type} onChange={(e) => set('type', e.target.value)}>
                      {['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cover image" hint="Square, at least 800px.">
                    <Input type="file" accept="image/*" className="py-3" />
                  </Field>
                </div>
                <fieldset>
                  <legend className="font-mono text-xs text-mute">Platforms that count</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const on = d.platforms.includes(p)
                      return (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={on}
                          onClick={() => set('platforms', on ? d.platforms.filter((x) => x !== p) : [...d.platforms, p])}
                          className={cn('inline-flex h-11 items-center gap-2 border px-4 text-sm transition-colors', on ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}
                        >
                          <BrandIcon name={p} className="size-4" />
                          {p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Instagram'}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="The brief" hint="What is this campaign and what do you want clipped? Min 20 characters.">
                  <Textarea value={d.summary} onChange={(e) => set('summary', e.target.value)} rows={5} />
                </Field>
                <Field label="Clip this" hint="One idea per line.">
                  <Textarea value={d.clipThis} onChange={(e) => set('clipThis', e.target.value)} rows={4} />
                </Field>
                <Field label="Off-limits" hint="One rule per line.">
                  <Textarea value={d.offLimits} onChange={(e) => set('offLimits', e.target.value)} rows={4} />
                </Field>
              </>
            )}
            {step === 2 && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Rate per 1,000 views (USD)">
                    <Input inputMode="decimal" value={d.rate} onChange={(e) => set('rate', e.target.value)} />
                  </Field>
                  <Field label="Total budget (USD)" hint={`Minimum $${SITE.minTopUpUsd}.`}>
                    <Input inputMode="numeric" value={d.budget} onChange={(e) => set('budget', e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="End date">
                    <Input type="date" value={d.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
                  </Field>
                  <Field label="Clip approval">
                    <Select value={d.approval} onChange={(e) => set('approval', e.target.value)}>
                      <option value="auto">Automatic, checked against the brief</option>
                      <option value="manual">Manual, I approve every clip</option>
                    </Select>
                  </Field>
                </div>
                <p className="border border-line bg-ink/50 p-4 text-sm text-mute rounded-2xl">
                  At ${rate.toFixed(2)} per 1,000 views, ${budget.toLocaleString()} pays for up to{' '}
                  <span className="text-paper">{maxViews.toLocaleString()}</span> verified views. A {SITE.platformFeePct}% platform fee applies to payouts.
                </p>
              </>
            )}
            {step === 3 && (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ['Name', d.title],
                  ['Type', d.type],
                  ['Platforms', d.platforms.join(', ')],
                  ['Rate', `$${rate.toFixed(2)} / 1,000 views`],
                  ['Budget', `$${budget.toLocaleString()}`],
                  ['Ends', d.endsOn || 'No end date'],
                  ['Approval', d.approval === 'auto' ? 'Automatic' : 'Manual'],
                ].map(([k, v]) => (
                  <div key={k} className="border border-line p-4 rounded-2xl">
                    <dt className="font-mono text-xs text-mute">{k}</dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
                <div className="border border-line p-4 sm:col-span-2 rounded-2xl">
                  <dt className="font-mono text-xs text-mute">Brief</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-mute">{d.summary}</dd>
                </div>
              </dl>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="mt-8 flex justify-between">
          <ActionButton variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </ActionButton>
          {step < 3 ? (
            <ActionButton onClick={() => setStep((s) => s + 1)} disabled={!valid}>
              Continue
            </ActionButton>
          ) : (
            <ActionButton onClick={publish}>Publish campaign</ActionButton>
          )}
        </div>
      </Card>
    </div>
  )
}
