'use client'

import { Loader2, Plus, Shuffle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Toggle } from '@/components/app/ui'
import { cn } from '@/lib/utils'

export type MockRow = { id: string; title: string; creator: string; cover_url: string; rate_cents: number; budget_cents: number; clips: number }

const TYPES = ['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other']
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
]
const input = 'h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper'
const label = 'mb-1.5 block text-xs text-mute'
const btn = 'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors disabled:opacity-40'

async function call(data: object) {
  const res = await fetch('/api/admin/mock', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!res.ok) throw new Error(j.error ?? 'That did not work.')
  return j
}

/** Make-believe campaigns to try the site with: made by hand or in one press, switched to public or not, and removed in one press. */
export function MockCampaigns({ rows, publicOn }: { rows: MockRow[]; publicOn: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPublic, setIsPublic] = useState(publicOn)
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', creator: '', type: 'Music', rate: '2.50', budget: '1000', cover: 1, platforms: ['tiktok', 'youtube', 'instagram'] as string[], summary: '' })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key)
    setMsg(null)
    try {
      setMsg({ ok: true, text: await fn() })
      router.refresh()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'That did not work.' })
    }
    setBusy('')
  }
  const valid = f.title.trim().length >= 2 && f.creator.trim().length >= 2 && Number(f.rate) >= 0.5 && Number(f.budget) >= 50 && f.platforms.length > 0

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm">Show them to everyone on logoless.io</p>
          <p className="text-xs text-mute">Off: only the team and the dev site see them. They never hold money and can never pay anyone.</p>
        </div>
        <Toggle label="Show mock campaigns to everyone" checked={isPublic} onChange={(on) => run('public', async () => { await call({ action: 'public', on }); setIsPublic(on); return on ? 'Everyone can see them now.' : 'Only the team can see them.' })} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={Boolean(busy)} className={cn(btn, 'bg-paper font-medium text-ink hover:bg-paper/85')} onClick={() => run('gen', async () => `Added ${((await call({ action: 'generate', count: 6 })) as { made?: number }).made} random campaigns.`)}>
          {busy === 'gen' ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />} Add 6 random
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn(btn, 'border border-line-strong hover:bg-paper/10')}>
          <Plus className="size-4" /> {open ? 'Close the form' : 'Make one myself'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          title="Makes a campaign that runs out of budget, with two made-up submissions from you, and sends you the warning and the summary."
          className={cn(btn, 'border border-line-strong hover:bg-paper/10')}
          onClick={() => run('ending', async () => { await call({ action: 'ending-test' }); return 'Done. Look in your notifications (and your email or Discord, whichever you chose) for the warning and the summary. The ended campaign is in the list below.' })}
        >
          {busy === 'ending' && <Loader2 className="size-4 animate-spin" />} Test the ending flow
        </button>
        {rows.length > 0 && (
          <button
            type="button"
            disabled={Boolean(busy)}
            className={cn(btn, 'border border-signal/50 text-signal hover:bg-signal/10')}
            onClick={() => {
              if (!window.confirm(`Delete all ${rows.length} mock campaigns and the clips sent to them?`)) return
              void run('clear', async () => { const j = (await call({ action: 'clear' })) as { removed?: number }; return `Removed ${j.removed}.` })
            }}
          >
            {busy === 'clear' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete all {rows.length}
          </button>
        )}
      </div>

      {open && (
        <form
          className="grid gap-5 rounded-[1.6rem] border border-line p-5"
          onSubmit={(e) => {
            e.preventDefault()
            void run('create', async () => {
              await call({ action: 'create', campaign: { title: f.title, creator: f.creator, type: f.type, cover: f.cover, rate: Number(f.rate), budget: Math.round(Number(f.budget)), platforms: f.platforms, summary: f.summary || undefined } })
              setF((s) => ({ ...s, title: '', creator: '', summary: '' }))
              return 'Made it. It is live for the team now.'
            })
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="mk-title">Campaign name</label>
              <input id="mk-title" className={input} value={f.title} maxLength={60} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Neon Static" />
            </div>
            <div>
              <label className={label} htmlFor="mk-creator">Artist or brand</label>
              <input id="mk-creator" className={input} value={f.creator} maxLength={60} onChange={(e) => set('creator', e.target.value)} placeholder="e.g. Nova Reyes" />
            </div>
            <div>
              <label className={label} htmlFor="mk-type">Type</label>
              <select id="mk-type" className={input} value={f.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="mk-rate">Pay per 1,000 views ($)</label>
                <input id="mk-rate" className={input} inputMode="decimal" value={f.rate} onChange={(e) => set('rate', e.target.value.replace(/[^0-9.]/g, ''))} />
              </div>
              <div>
                <label className={label} htmlFor="mk-budget">Budget ($)</label>
                <input id="mk-budget" className={input} inputMode="numeric" value={f.budget} onChange={(e) => set('budget', e.target.value.replace(/\D/g, '').slice(0, 7))} />
              </div>
            </div>
          </div>
          <fieldset>
            <legend className={label}>Cover</legend>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" aria-pressed={f.cover === n} aria-label={`Cover ${n}`} onClick={() => set('cover', n)} className={cn('size-14 overflow-hidden rounded-xl border-2 transition-colors', f.cover === n ? 'border-paper' : 'border-transparent opacity-70 hover:opacity-100')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/covers/${String(n).padStart(2, '0')}.jpg`} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={label}>Platforms that count</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = f.platforms.includes(p.id)
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => set('platforms', on ? f.platforms.filter((x) => x !== p.id) : [...f.platforms, p.id])} className={cn('h-10 rounded-full border px-4 text-sm transition-colors', on ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <div>
            <label className={label} htmlFor="mk-brief">The brief (optional)</label>
            <textarea id="mk-brief" className={`${input} h-24 py-3`} value={f.summary} maxLength={1500} onChange={(e) => set('summary', e.target.value)} placeholder="Leave empty for a ready-made brief" />
          </div>
          <div>
            <button type="submit" disabled={Boolean(busy) || !valid} className={cn(btn, 'bg-paper font-medium text-ink hover:bg-paper/85')}>
              {busy === 'create' && <Loader2 className="size-4 animate-spin" />} Make the mock campaign
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={cn('text-sm', msg.ok ? 'text-emerald-300' : 'text-signal')}>
          {msg.text}
        </p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.cover_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{r.title} <span className="text-mute">by {r.creator}</span></p>
                <p className="text-xs text-mute">
                  ${(r.rate_cents / 100).toFixed(2)} per 1k · ${(r.budget_cents / 100).toLocaleString()} budget · {r.clips} {r.clips === 1 ? 'clip' : 'clips'}
                </p>
              </div>
              <Link href={`/campaign/${r.id}`} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
                Open
              </Link>
              <button type="button" aria-label={`Delete ${r.title}`} disabled={Boolean(busy)} className="grid size-9 place-items-center rounded-full text-mute transition-colors hover:bg-signal/10 hover:text-signal disabled:opacity-40" onClick={() => run(`del-${r.id}`, async () => { await call({ action: 'delete', id: r.id }); return `Deleted ${r.title}.` })}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
