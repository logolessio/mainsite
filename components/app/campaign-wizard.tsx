'use client'

import { ImagePlus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { useTransitions } from '@/components/shell/transition-provider'
import { Field, Input, Select, Textarea } from '@/components/ui/fields'
import { uploadImage } from '@/lib/image-client'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ActionButton, Card } from './ui'

const PLATFORMS = ['tiktok', 'youtube', 'instagram'] as const
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

/**
 * One short page instead of four steps. The essentials are up front (name, cover, brief, rate and budget); the rest sits under
 * "More options". Nothing is charged: the campaign draws from the brand's balance as clippers earn, up to the budget.
 */
export function CampaignWizard({ balanceCents = 0 }: { balanceCents?: number }) {
  const { navigate } = useTransitions()
  const [d, setD] = useState({
    title: '',
    creator: '',
    type: 'Music',
    cover: '',
    coverPreview: '',
    platforms: ['tiktok', 'youtube', 'instagram'] as string[],
    summary: '',
    clipThis: '',
    offLimits: '',
    rate: '2.50',
    budget: '500',
    endsOn: '',
  })
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof d, v: string | string[]) => setD((s) => ({ ...s, [k]: v }))
  const rate = Number(d.rate) || 0
  const budget = Number(d.budget) || 0
  const maxViews = rate > 0 ? Math.floor((budget / rate) * 1000) : 0
  const total = budget * (1 + SITE.platformFeePct / 100)
  const balance = balanceCents / 100
  const valid = d.title.trim().length >= 2 && d.creator.trim().length >= 2 && d.platforms.length > 0 && d.summary.trim().length >= 20 && rate >= 0.5 && budget >= SITE.minCampaignBudgetUsd
  const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)

  const pickCover = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const id = await uploadImage('cover', file)
      setD((s) => ({ ...s, cover: id, coverPreview: `/api/img/${id}` }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    }
    setUploading(false)
  }

  const publish = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: d.title, creator: d.creator, type: d.type, cover: d.cover || null, platforms: d.platforms, summary: d.summary, clipThis: lines(d.clipThis), offLimits: lines(d.offLimits), rate, budget, endsOn: d.endsOn || null }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send your campaign.')
      navigate('/brand/campaigns?requested=1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your campaign.')
      setBusy(false)
    }
  }

  return (
    <div className="grid max-w-5xl items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-5">
              <Field label="Campaign name">
                <Input value={d.title} maxLength={60} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Red Room" />
              </Field>
              <Field label="Artist or brand">
                <Input value={d.creator} maxLength={60} onChange={(e) => set('creator', e.target.value)} placeholder="e.g. KXNG VALE" />
              </Field>
            </div>
            <label className="group relative grid size-36 cursor-pointer place-items-center self-end overflow-hidden rounded-3xl border border-dashed border-line-strong text-mute transition-colors hover:border-paper hover:text-paper sm:size-[8.2rem]">
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Cover image" onChange={(e) => pickCover(e.target.files?.[0])} />
              {d.coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.coverPreview} alt="" className="size-full object-cover" />
              ) : uploading ? (
                <Loader2 aria-hidden="true" className="size-5 animate-spin" />
              ) : (
                <span className="grid justify-items-center gap-1.5 text-center text-xs">
                  <ImagePlus aria-hidden="true" className="size-5" /> Cover
                </span>
              )}
            </label>
          </div>

          <Field label="The brief" hint="What do you want clipped? A few sentences is plenty.">
            <Textarea value={d.summary} onChange={(e) => set('summary', e.target.value)} rows={4} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pay per 1,000 views" hint="What clippers earn.">
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-mute">$</span>
                <Input inputMode="decimal" value={d.rate} onChange={(e) => set('rate', e.target.value.replace(/[^0-9.]/g, ''))} className="pl-8" />
              </span>
            </Field>
            <Field label="Budget cap" hint={`The most this campaign can pay clippers. Minimum $${SITE.minCampaignBudgetUsd}.`}>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-mute">$</span>
                <Input inputMode="numeric" value={d.budget} onChange={(e) => set('budget', e.target.value.replace(/\D/g, '').slice(0, 6))} className="pl-8" />
              </span>
            </Field>
          </div>

          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="w-fit text-sm text-mute underline underline-offset-4 hover:text-paper">
            {more ? 'Fewer options' : 'More options'}
          </button>
          {more && (
            <div className="grid gap-5 border-t border-line pt-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Type">
                  <Select value={d.type} onChange={(e) => set('type', e.target.value)}>
                    {['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="End date" hint="Optional.">
                  <Input type="date" value={d.endsOn} onChange={(e) => set('endsOn', e.target.value)} />
                </Field>
              </div>
              <fieldset>
                <legend className="font-mono text-xs text-mute">Platforms that count</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const on = d.platforms.includes(p)
                    return (
                      <button key={p} type="button" aria-pressed={on} onClick={() => set('platforms', on ? d.platforms.filter((x) => x !== p) : [...d.platforms, p])} className={cn('inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm transition-colors', on ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}>
                        <BrandIcon name={p} className="size-4" />
                        {p === 'youtube' ? 'YouTube' : p === 'tiktok' ? 'TikTok' : 'Instagram'}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <Field label="Clip this" hint="One idea per line.">
                <Textarea value={d.clipThis} onChange={(e) => set('clipThis', e.target.value)} rows={3} />
              </Field>
              <Field label="Off limits" hint="One rule per line.">
                <Textarea value={d.offLimits} onChange={(e) => set('offLimits', e.target.value)} rows={3} />
              </Field>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:sticky lg:top-24">
        <Card title="What it costs">
          <p className="text-sm leading-relaxed text-mute">
            Nothing up front. At {usd(rate)} per 1,000 views, {usd(budget)} pays for up to <span className="text-paper">{maxViews.toLocaleString()}</span> verified views. Clippers keep all of it. Our {SITE.platformFeePct}% fee comes on top, so the most this can ever cost is <span className="text-paper">{usd(total)}</span>, taken from your balance only as clippers earn.
          </p>
          <p className="mt-4 text-sm text-mute">
            Balance: <span className="text-paper tabular-nums">{usd(balance)}</span>.{' '}
            <Link href="/brand/balance" className="underline underline-offset-4 hover:text-paper">
              Add funds
            </Link>
          </p>
          <p className="mt-4 text-xs leading-relaxed text-mute">We cover PayPal&apos;s fees. We read every campaign before it goes live. If your balance covers the start, it goes live as soon as it is approved.</p>
        </Card>
        {error && <p role="alert" className="text-sm text-signal">{error}</p>}
        <ActionButton onClick={publish} disabled={busy || !valid} className="h-12">
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Send for review
        </ActionButton>
      </div>
    </div>
  )
}
