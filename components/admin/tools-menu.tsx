'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Activity, BarChart3, Banknote, CheckCircle2, Clapperboard, Copy, Eye, EyeOff, FileText, Loader2, Megaphone, Pencil, Search, Settings, ShieldCheck, Shuffle, Users, Wrench, X, XCircle } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCopy } from '@/components/shell/copy-provider'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Pulse = {
  settings: Record<string, string>
  counts: Record<string, number>
  page: Record<string, number>
  feed: { ts: number; kind: string; name: string; status: number | null; actor: string | null }[]
}

export const HERO_SHUFFLE = 'logoless:hero-shuffle'

const SWITCHES = [
  ['payouts_paused', 'Pause all withdrawals'],
  ['submissions_paused', 'Pause clip submissions'],
  ['signups_paused', 'Pause new accounts'],
] as const

const CHECKS = [
  ['database', 'Database'],
  ['ledger', 'Money adds up'],
  ['chains', 'Logs untampered'],
] as const

const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`
}

/** The admin's toolbox: edit text, jump anywhere, flip emergency switches, run checks and watch live activity. */
export function ToolsMenu() {
  const { editing, setEditing } = useCopy()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false) // "view as visitor"
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean | 'run'>>({})
  const [copied, setCopied] = useState(false)
  const [q, setQ] = useState('')
  const wrap = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    fetch(`/api/admin/tools?path=${encodeURIComponent(pathname)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Pulse | null) => j && setPulse(j))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!open) return
    load()
    const t = window.setInterval(load, 5000)
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, load])

  // Profile pages show nothing but the card.
  if (pathname.startsWith('/@') || pathname.startsWith('/u/')) return null

  if (hidden)
    return (
      <button type="button" onClick={() => setHidden(false)} className="fixed bottom-4 left-4 z-[70] inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface/90 px-3 text-xs text-mute hover:text-paper">
        <Eye className="size-3.5" /> Back to admin view
      </button>
    )

  const flip = async (key: string, on: boolean) => {
    if (on && !window.confirm('Switch this on? It takes effect straight away.')) return
    setPulse((p) => (p ? { ...p, settings: { ...p.settings, [key]: on ? '1' : '0' } } : p))
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value: on ? '1' : '0' }) })
    if (!res.ok) load()
  }

  const runChecks = async () => {
    for (const [id] of CHECKS) {
      setChecks((c) => ({ ...c, [id]: 'run' }))
      const res = await fetch('/api/admin/diagnostics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ check: id }) }).catch(() => null)
      const j = (await res?.json().catch(() => null)) as { ok?: boolean } | null
      setChecks((c) => ({ ...c, [id]: Boolean(res?.ok && j?.ok) }))
    }
  }

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }
  const counts = pulse?.counts ?? {}
  const links = [
    ['/admin', 'Overview', BarChart3, 0],
    ['/admin/campaigns', 'Campaigns', Megaphone, (counts.requests ?? 0) + (counts.launch ?? 0)],
    ['/admin/submissions', 'Clips', Clapperboard, counts.clips ?? 0],
    ['/admin/payouts', 'Payouts', Banknote, counts.payouts ?? 0],
    ['/admin/users', 'Users', Users, 0],
    ['/admin/logs', 'Logs', Activity, 0],
    ['/admin/text', 'Site text', FileText, 0],
    ['/admin/keys', 'Keys', ShieldCheck, 0],
    ['/admin/settings', 'Settings', Settings, 0],
  ] as const

  return (
    <div ref={wrap} className="fixed bottom-4 left-4 z-[70]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            className="absolute bottom-14 left-0 max-h-[78dvh] w-[min(360px,calc(100vw-2rem))] origin-bottom-left overflow-y-auto rounded-[26px] border border-line-strong bg-surface/95 p-3 shadow-[0_30px_70px_-20px_rgb(0_0_0/0.95)] backdrop-blur"
          >
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <p className="font-display text-xl">Tools</p>
              <span className="font-mono text-[11px] text-mute">{counts.online ?? '–'} online now</span>
            </div>

            <Group title="This page">
              <div className="grid grid-cols-2 gap-1.5">
                <Tile active={editing} onClick={() => { setEditing(!editing); setOpen(false) }} icon={<Pencil className="size-4" />}>{editing ? 'Stop editing' : 'Edit text'}</Tile>
                <Tile onClick={() => { setHidden(true); setEditing(false); setOpen(false) }} icon={<EyeOff className="size-4" />}>View as visitor</Tile>
                <Tile onClick={async () => { await navigator.clipboard?.writeText(location.href).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }} icon={<Copy className="size-4" />}>{copied ? 'Copied' : 'Copy link'}</Tile>
                {pathname === '/' ? (
                  <Tile onClick={() => window.dispatchEvent(new Event(HERO_SHUFFLE))} icon={<Shuffle className="size-4" />}>New headline</Tile>
                ) : (
                  <Tile onClick={() => go(`/admin/logs?tab=events&q=${encodeURIComponent(pathname)}`)} icon={<Activity className="size-4" />}>Page activity</Tile>
                )}
              </div>
              <p className="mt-2 px-1 font-mono text-[11px] text-mute">
                {pulse ? `${pulse.page.views24 ?? 0} views today · ${pulse.page.views7 ?? 0} this week · ${pulse.page.visitors7 ?? 0} visitors · ${pulse.page.errors7 ?? 0} errors` : 'Loading…'}
              </p>
            </Group>

            <Group title="Go to">
              <div className="grid grid-cols-3 gap-1.5">
                {links.map(([href, label, Icon, n]) => (
                  <button key={href} type="button" onClick={() => go(href)} className="relative flex flex-col items-center gap-1 rounded-xl border border-line px-1 py-2.5 text-[11px] transition-colors hover:bg-paper/10">
                    <Icon className="size-4" />
                    {label}
                    {n > 0 && <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[9px] leading-4 font-semibold">{n}</span>}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (q.trim()) go(`/admin/users?q=${encodeURIComponent(q.trim())}`)
                }}
                className="relative mt-2"
              >
                <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-mute" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person…" className="h-9 w-full rounded-full border border-line-strong bg-ink/80 pr-3 pl-9 text-xs focus:outline-none" />
              </form>
            </Group>

            <Group title="Emergency switches">
              <ul className="grid gap-1">
                {SWITCHES.map(([k, label]) => {
                  const on = pulse?.settings[k] === '1'
                  return (
                    <li key={k}>
                      <button type="button" disabled={!pulse} onClick={() => flip(k, !on)} className={cn('flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs transition-colors', on ? 'border-signal/60 bg-signal/10 text-signal' : 'border-line hover:bg-paper/10')}>
                        {label}
                        <span className={cn('relative h-5 w-9 rounded-full', on ? 'bg-signal' : 'bg-line-strong')}>
                          <span className={cn('absolute top-0.5 size-4 rounded-full bg-paper transition-all', on ? 'left-[18px]' : 'left-0.5')} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Group>

            <Group title="Health">
              <div className="flex flex-wrap items-center gap-2">
                {CHECKS.map(([id, label]) => {
                  const r = checks[id]
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px]">
                      {r === 'run' ? <Loader2 className="size-3 animate-spin" /> : r === true ? <CheckCircle2 className="size-3 text-emerald-300" /> : r === false ? <XCircle className="size-3 text-signal" /> : <span className="size-3 rounded-full border border-line-strong" />}
                      {label}
                    </span>
                  )
                })}
                <button type="button" onClick={runChecks} className="ml-auto inline-flex h-8 items-center gap-1 rounded-full bg-paper px-3 text-xs font-medium text-ink hover:bg-paper/85">Run</button>
              </div>
            </Group>

            <Group title="Live activity">
              <ul className="grid gap-0.5 font-mono text-[10.5px]">
                {(pulse?.feed ?? []).map((e, i) => (
                  <li key={i} className="flex items-center gap-2 text-mute">
                    <span className="w-7 shrink-0">{ago(e.ts)}</span>
                    <span className={cn('w-14 shrink-0 truncate', e.kind === 'error' || e.kind === 'security' ? 'text-signal' : e.kind === 'money' ? 'text-emerald-300' : '')}>{e.kind}</span>
                    <span className="min-w-0 truncate text-paper/80">{e.name}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => go('/admin/logs?tab=events')} className="mt-2 text-xs text-mute underline underline-offset-4 hover:text-paper">Open all logs</button>
            </Group>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Admin tools"
        className={cn('inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm shadow-lg transition-colors', editing ? 'border-signal bg-signal text-paper' : 'border-line-strong bg-surface text-paper hover:bg-raised')}
      >
        {open ? <X className="size-4" /> : <Wrench className="size-4" />}
        {editing ? 'Editing text' : 'Tools'}
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-2 py-3">
      <h3 className="mb-2 font-mono text-[10px] tracking-widest text-mute uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Tile({ children, icon, onClick, active }: { children: React.ReactNode; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex h-10 items-center gap-2 rounded-xl border px-3 text-xs transition-colors', active ? 'border-signal bg-signal/15 text-signal' : 'border-line hover:bg-paper/10')}>
      {icon}
      {children}
    </button>
  )
}
