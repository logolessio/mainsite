'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { uploadImage } from '@/lib/image-client'
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
    creator: '',
    type: 'Music',
    cover: '',
    coverPreview: '',
    platforms: ['tiktok'] as string[],
    summary: '',
    clipThis: '',
    offLimits: '',
    rate: '2.50',
    budget: '1000',
    endsOn: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof d, v: string | string[]) => setD((s) => ({ ...s, [k]: v }))
  const rate = Number(d.rate) || 0
  const budget = Number(d.budget) || 0
  const maxViews = rate > 0 ? Math.floor((budget / rate) * 1000) : 0
  const valid = [
    d.title.trim().length >= 2 && d.creator.trim().length >= 2 && d.platforms.length > 0,
    d.summary.trim().length >= 20,
    rate > 0 && budget >= SITE.minTopUpUsd,
    true,
  ][step]

  const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)

  const pickCover = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      const id = await uploadImage('cover', file)
      setD((s) => ({ ...s, cover: id, coverPreview: `/api/img/${id}` }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    }
  }

  const publish = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: d.title,
          creator: d.creator,
          type: d.type,
          cover: d.cover || null,
          platforms: d.platforms,
          summary: d.summary,
          clipThis: lines(d.clipThis),
          offLimits: lines(d.offLimits),
          rate,
          budget,
          endsOn: d.endsOn || null,
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send your request.')
      navigate('/brand/campaigns?requested=1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your request.')
      setBusy(false)
    }
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
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Campaign name">
                    <Input value={d.title} maxLength={60} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Red Room" />
                  </Field>
                  <Field label="Artist or brand name">
                    <Input value={d.creator} maxLength={60} onChange={(e) => set('creator', e.target.value)} placeholder="e.g. KXNG VALE" />
                  </Field>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Type">
                    <Select value={d.type} onChange={(e) => set('type', e.target.value)}>
                      {['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Cover image" hint="Square works best. We shrink it for you.">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {d.coverPreview && <img src={d.coverPreview} alt="" className="size-12 rounded-xl object-cover" />}
                      <Input type="file" accept="image/png,image/jpeg,image/webp" className="py-3" onChange={(e) => pickCover(e.target.files?.[0])} />
                    </div>
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
                  <Field label="End date (optional)">
                    <Input type="date" value={d.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
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
                  ['Artist or brand', d.creator],
                  ['Type', d.type],
                  ['Platforms', d.platforms.join(', ')],
                  ['Rate', `$${rate.toFixed(2)} / 1,000 views`],
                  ['Budget', `$${budget.toLocaleString()}`],
                  ['Ends', d.endsOn || 'No end date'],
                ].map(([k, v]) => (
                  <div key={k} className="border border-line p-4 rounded-2xl">
                    <dt className="font-mono text-xs text-mute">{k}</dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
                <div className="border border-line p-4 sm:col-span-2 rounded-2xl">
                  <dt className="font-mono text-xs text-mute">What happens next</dt>
                  <dd className="mt-2 grid gap-1.5 text-mute">
                    <span><span className="text-paper">1.</span> You send this request. Nothing is charged yet.</span>
                    <span><span className="text-paper">2.</span> We review it and confirm we will launch it.</span>
                    <span><span className="text-paper">3.</span> You pay the ${budget.toLocaleString()} budget securely with Stripe.</span>
                    <span><span className="text-paper">4.</span> We launch your campaign and clippers can start posting.</span>
                  </dd>
                </div>
                <div className="border border-line p-4 sm:col-span-2 rounded-2xl">
                  <dt className="font-mono text-xs text-mute">Brief</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-mute">{d.summary}</dd>
                </div>
              </dl>
            )}
          </motion.div>
        </AnimatePresence>
        {error && <p role="alert" className="mt-4 text-sm text-signal">{error}</p>}
        <div className="mt-8 flex justify-between">
          <ActionButton variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            Back
          </ActionButton>
          {step < 3 ? (
            <ActionButton onClick={() => setStep((s) => s + 1)} disabled={!valid}>
              Continue
            </ActionButton>
          ) : (
            <ActionButton onClick={publish} disabled={busy}>
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Send request
            </ActionButton>
          )}
        </div>
      </Card>
    </div>
  )
}
