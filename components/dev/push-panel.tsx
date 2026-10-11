'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ExternalLink, History, Loader2, Rocket, Undo2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Row = { id: string; name: string; description: string; category: string; path: string; live: boolean }
type Log = { at: number; by: string; action: 'push' | 'undo'; ids: string[] }
const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

/** Pick features, push them to the live site, and undo them. Used as a window on the dev site and as a page in the admin panel. */
export function PushPanel({ onClose }: { onClose?: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [log, setLog] = useState<Log[]>([])
  const [pick, setPick] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'features' | 'history'>('features')
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/features', { cache: 'no-store' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { features?: Row[]; log?: Log[]; error?: string }
    if (!res?.ok || !j.features) return setError(j.error ?? 'Could not load. Are you signed in as an admin?')
    setRows(j.features)
    setLog(j.log ?? [])
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const send = async (action: 'push' | 'undo', ids: string[]) => {
    setBusy(true)
    setError('')
    setMsg('')
    const res = await fetch('/api/admin/features', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ids }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { features?: Row[]; log?: Log[]; error?: string }
    setBusy(false)
    setConfirm(false)
    if (!res?.ok || !j.features) return setError(j.error ?? 'That did not work.')
    setRows(j.features)
    setLog(j.log ?? [])
    setPick(new Set())
    setMsg(action === 'push' ? `${ids.length} feature${ids.length > 1 ? 's' : ''} pushed. They are live on logoless.io now.` : 'Taken off the live site.')
  }

  const toggle = (id: string) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ready = useMemo(() => (rows ?? []).filter((r) => !r.live), [rows])
  const live = useMemo(() => (rows ?? []).filter((r) => r.live), [rows])
  const name = (id: string) => rows?.find((r) => r.id === id)?.name ?? id
  const chosen = [...pick]

  return (
    <div className="flex max-h-[min(46rem,88dvh)] w-full flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-[#0c0c0f] shadow-[0_50px_120px_-30px_rgb(0_0_0/0.95)]">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-6 pb-4">
        <div>
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-mute uppercase"><Rocket className="size-3.5" /> Dev to live</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Push to logoless.io</h2>
          <p className="mt-1 text-sm text-mute">Tick what you want on the live site, then push. Nothing here changes the live site until you press the button, and every push can be undone.</p>
        </div>
        {onClose && (
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/10">
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="flex gap-1 px-6 pt-3">
        {(['features', 'history'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('relative inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm capitalize transition-colors', tab === t ? 'text-ink' : 'text-mute hover:text-paper')}>
            {tab === t && <motion.span layoutId="push-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-full bg-paper" />}
            <span className="relative inline-flex items-center gap-1.5">{t === 'history' && <History className="size-3.5" />}{t}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        {!rows && !error && <p className="text-sm text-mute">Loading…</p>}
        {tab === 'features' && rows && (
          <div className="grid gap-6">
            <section>
              <h3 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">Ready to push · {ready.length}</h3>
              {ready.length === 0 && <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-center text-sm text-mute">Everything is already live.</p>}
              <ul className="grid gap-2">
                {ready.map((r) => {
                  const on = pick.has(r.id)
                  return (
                    <li key={r.id}>
                      <div className={cn('flex gap-4 rounded-2xl border p-4 transition-colors', on ? 'border-paper/70 bg-paper/[0.07]' : 'border-line hover:bg-white/[0.03]')}>
                        <button type="button" onClick={() => toggle(r.id)} aria-pressed={on} aria-label={`Select ${r.name}`} className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border transition-colors', on ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>
                          {on && <Check className="size-4" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => toggle(r.id)} className="flex flex-wrap items-center gap-2 text-left">
                            <span className="text-[15px] font-medium">{r.name}</span>
                            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[10px] text-mute">{r.category}</span>
                          </button>
                          <p className="mt-1 text-sm leading-relaxed text-mute">{r.description}</p>
                          <a href={r.path} className="mt-2 inline-flex items-center gap-1 text-xs text-mute underline underline-offset-4 hover:text-paper">
                            See it on the dev site <ExternalLink className="size-3" />
                          </a>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
            <section>
              <h3 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">Live on logoless.io · {live.length}</h3>
              {live.length === 0 && <p className="text-sm text-mute">Nothing pushed yet.</p>}
              <ul className="grid gap-2">
                {live.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] px-4 py-3">
                    <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
                    <span className="min-w-0 flex-1 text-sm">{r.name}</span>
                    <button type="button" disabled={busy} onClick={() => send('undo', [r.id])} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-xs transition-colors hover:bg-white/10 disabled:opacity-50">
                      <Undo2 className="size-3.5" /> Undo
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {tab === 'history' && (
          <ul className="grid gap-2">
            {log.length === 0 && <li className="text-sm text-mute">No pushes yet.</li>}
            {log.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3">
                <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', l.action === 'push' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-mute')}>{l.action === 'push' ? 'Pushed' : 'Undone'}</span>
                <span className="min-w-0 flex-1 text-sm">{l.ids.map(name).join(', ')}</span>
                <span className="font-mono text-[11px] text-mute">{ago(l.at)} · {l.by.split('@')[0]}</span>
                {l.action === 'push' && (
                  <button type="button" disabled={busy} onClick={() => send('undo', l.ids)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-xs hover:bg-white/10 disabled:opacity-50">
                    <Undo2 className="size-3.5" /> Undo this push
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-line px-6 py-4">
        <AnimatePresence initial={false}>
          {(msg || error) && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role={error ? 'alert' : 'status'} className={cn('mb-3 overflow-hidden rounded-2xl px-4 py-2.5 text-sm', error ? 'bg-signal/10 text-signal' : 'bg-emerald-400/10 text-emerald-300')}>
              {error || msg}
            </motion.p>
          )}
        </AnimatePresence>
        {tab === 'features' && (
          <div className="flex flex-wrap items-center gap-3">
            {!confirm ? (
              <button type="button" disabled={chosen.length === 0 || busy} onClick={() => setConfirm(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-40">
                <Rocket className="size-4" /> Push {chosen.length > 0 ? `${chosen.length} feature${chosen.length > 1 ? 's' : ''}` : 'to live'}
              </button>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={() => send('push', chosen)} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-50">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Yes, make {chosen.length === 1 ? 'it' : 'them'} live now
                </button>
                <button type="button" onClick={() => setConfirm(false)} className="h-12 rounded-full px-4 text-sm text-mute hover:text-paper">Cancel</button>
              </>
            )}
            <p className="text-xs text-mute">{confirm ? 'Real visitors will see it straight away.' : 'You can undo any push in one click.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
