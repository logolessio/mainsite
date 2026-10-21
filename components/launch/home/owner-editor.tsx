'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { COPY_MAX, PAGE_ACCENTS, PAGE_BACKGROUNDS, type PageConfig, type PageCopy, type PageMode } from '@/lib/launch-page'
import { BANNER_PRESETS, CARD_EFFECTS } from '@/lib/profile-style'
import { type LinkItem, MAX_LINKS, PLATFORMS } from '@/lib/socials'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

export type Draft = { headline: string; text: string; end: number | null; page: PageConfig; items: LinkItem[] }

type Tab = 'words' | 'countdown' | 'look' | 'links'
const TABS: { id: Tab; label: string }[] = [
  { id: 'words', label: 'Words' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'look', label: 'Look' },
  { id: 'links', label: 'Links' },
]

const WORDS: { key: keyof PageCopy; label: string; long?: boolean; group: string }[] = [
  { key: 'kicker', label: 'Small label above the headline', group: 'Coming soon' },
  { key: 'joinLabel', label: 'Waitlist button on /links', group: 'Coming soon' },
  { key: 'emailPlaceholder', label: 'Email field', group: 'Coming soon' },
  { key: 'sendLabel', label: 'Email button', group: 'Coming soon' },
  { key: 'reserveLabel', label: 'Username button', group: 'Coming soon' },
  { key: 'doneTitle', label: 'When they are on the list', group: 'Coming soon' },
  { key: 'liveHeadline', label: 'Headline', group: 'Once open' },
  { key: 'liveText', label: 'Line under it', long: true, group: 'Once open' },
  { key: 'startTitle', label: 'Get started title (and /links button)', group: 'Once open' },
  { key: 'startText', label: 'Get started text', long: true, group: 'Once open' },
  { key: 'signupLabel', label: 'Email sign-up button', group: 'Once open' },
  { key: 'loginLabel', label: 'Log in link', group: 'Once open' },
]

const input = 'w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[14px] text-paper outline-none transition-colors placeholder:text-paper/30 focus:border-white/35'
const label = 'mb-1.5 block text-[12px] font-medium text-paper/55'

/** A date for an <input type="datetime-local">, in the owner's own time. */
const toLocal = (sec: number | null) => {
  if (!sec) return ''
  const d = new Date(sec * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * The owner's editor, on the page itself: every change shows at once behind it, and nothing is kept until Save.
 * The words, countdown and look are saved together; the link buttons and social icons are the same list as Owner, Socials and links.
 */
export function OwnerEditor({ open, onClose, draft, setDraft, mode, setMode, initial }: { open: boolean; onClose: () => void; draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>>; mode: PageMode; setMode: (m: PageMode) => void; initial: Draft }) {
  const [tab, setTab] = useState<Tab>('words')
  const [saved, setSaved] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, onClose])

  const setCopy = (k: keyof PageCopy, v: string) => setDraft((d) => ({ ...d, page: { ...d.page, copy: { ...d.page.copy, [k]: v.slice(0, COPY_MAX[k]) } } }))
  const setLook = (patch: Partial<PageConfig['look']>) => setDraft((d) => ({ ...d, page: { ...d.page, look: { ...d.page.look, ...patch } } }))
  const setItems = (fn: (l: LinkItem[]) => LinkItem[]) => setDraft((d) => ({ ...d, items: fn(d.items) }))

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/launch/page', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ headline: draft.headline, text: draft.text, end: draft.end, page: draft.page }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string; page?: PageConfig; headline?: string; text?: string; end?: number | null }
      if (!res.ok) throw new Error(j.error ?? 'Could not save.')
      let items = draft.items
      if (JSON.stringify(draft.items) !== JSON.stringify(saved.items)) {
        const r2 = await fetch('/api/admin/socials', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links: draft.items }) })
        const j2 = (await r2.json().catch(() => ({}))) as { error?: string; links?: LinkItem[] }
        if (!r2.ok) throw new Error(j2.error ?? 'Could not save the links.')
        items = j2.links ?? items
      }
      const next = { headline: j.headline ?? draft.headline, text: j.text ?? draft.text, end: j.end ?? null, page: j.page ?? draft.page, items }
      setDraft(next)
      setSaved(next)
      setDone(true)
      window.setTimeout(() => setDone(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="editor"
          role="dialog"
          aria-label="Edit this page"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="fixed inset-x-2 bottom-2 z-50 flex max-h-[72dvh] flex-col overflow-hidden rounded-[24px] border border-white/12 bg-[#0b0b0d]/92 text-left shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-2xl md:inset-x-auto md:top-3 md:right-3 md:bottom-3 md:max-h-none md:w-[400px]"
        >
          <header className="flex items-center gap-3 border-b border-white/8 px-5 pt-4 pb-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">Edit this page</p>
              <p className="text-[12px] text-paper/45">Only you see this. Changes show behind as you go.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close the editor" className="grid size-9 place-items-center rounded-full text-paper/60 transition-colors hover:bg-white/8 hover:text-paper">
              <X className="size-4" />
            </button>
          </header>

          <div className="flex items-center gap-1 px-4 pt-3">
            {TABS.map((t) => (
              <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)} className={cn('relative rounded-pill px-3 py-1.5 text-[13px] transition-colors', tab === t.id ? 'text-ink' : 'text-paper/60 hover:text-paper')}>
                {tab === t.id && <motion.span layoutId="ed-tab" className="absolute inset-0 rounded-pill bg-paper" transition={{ duration: 0.35, ease: EASE }} />}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-5">
            {tab === 'words' && (
              <div className="grid gap-4">
                <Group title="Coming soon">
                  <div>
                    <label className={label} htmlFor="ed-headline">Headline</label>
                    <input id="ed-headline" className={input} value={draft.headline} maxLength={90} onChange={(e) => setDraft((d) => ({ ...d, headline: e.target.value }))} />
                  </div>
                  <div>
                    <label className={label} htmlFor="ed-text">Line under it</label>
                    <textarea id="ed-text" rows={3} className={cn(input, 'resize-none')} value={draft.text} maxLength={240} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} />
                  </div>
                  {WORDS.filter((w) => w.group === 'Coming soon').map((w) => (
                    <Field key={w.key} w={w} value={draft.page.copy[w.key]} onChange={(v) => setCopy(w.key, v)} />
                  ))}
                </Group>
                <Group title="Once open">
                  {WORDS.filter((w) => w.group === 'Once open').map((w) => (
                    <Field key={w.key} w={w} value={draft.page.copy[w.key]} onChange={(v) => setCopy(w.key, v)} />
                  ))}
                </Group>
              </div>
            )}

            {tab === 'countdown' && (
              <div className="grid gap-4">
                <div>
                  <label className={label} htmlFor="ed-end">Counts down to (your time)</label>
                  <input
                    id="ed-end"
                    type="datetime-local"
                    className={cn(input, '[color-scheme:dark]')}
                    value={toLocal(draft.end)}
                    onChange={(e) => {
                      const t = e.target.value ? Math.floor(new Date(e.target.value).getTime() / 1000) : null
                      setDraft((d) => ({ ...d, end: t && Number.isFinite(t) ? t : null }))
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 7, 14, 30].map((days) => (
                    <button key={days} type="button" onClick={() => setDraft((d) => ({ ...d, end: Math.floor(Date.now() / 1000 / 3600) * 3600 + days * 86400 }))} className="rounded-pill border border-white/12 px-3 py-1.5 text-[12.5px] text-paper/70 transition-colors hover:border-white/30 hover:text-paper">
                      In {days} {days === 1 ? 'day' : 'days'}
                    </button>
                  ))}
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, end: null }))} className="rounded-pill border border-white/12 px-3 py-1.5 text-[12.5px] text-paper/70 transition-colors hover:border-white/30 hover:text-paper">
                    No countdown
                  </button>
                </div>
                <p className="text-[12.5px] leading-relaxed text-paper/45">
                  The same countdown as the Launch page in the owner dashboard. If the site is set to open by itself, it opens when this reaches zero. Switching the coming-soon page on or off stays there.
                </p>
              </div>
            )}

            {tab === 'look' && (
              <div className="grid gap-5">
                <div>
                  <p className={label}>Background</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAGE_BACKGROUNDS.map((b) => (
                      <Swatch key={b.id} on={draft.page.look.bg === b.id} onClick={() => setLook({ bg: b.id })} label={b.label} title={b.note} style={{ background: b.id === 'reels' ? 'repeating-linear-gradient(90deg,#000 0 14px,#1a1a1d 14px 30px)' : b.id === 'glow' ? `radial-gradient(circle at 30% 20%,${draft.page.look.accent}55,#000 70%)` : '#000' }} />
                    ))}
                    {BANNER_PRESETS.map((b) => (
                      <Swatch key={b.id} on={draft.page.look.bg === b.id} onClick={() => setLook({ bg: b.id })} label={b.label} style={{ background: b.css }} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className={label}>Effect</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_EFFECTS.map((e) => (
                      <button key={e.id} type="button" aria-pressed={draft.page.look.effect === e.id} onClick={() => setLook({ effect: e.id })} className={cn('rounded-pill border px-3 py-1.5 text-[12.5px] transition-colors', draft.page.look.effect === e.id ? 'border-paper bg-paper text-ink' : 'border-white/12 text-paper/70 hover:border-white/30 hover:text-paper')}>
                        {e.label}
                      </button>
                    ))}
                  </div>
                  {draft.page.look.effect !== 'none' && (
                    <label className="mt-3 flex items-center gap-3 text-[12.5px] text-paper/55">
                      Amount
                      <input type="range" min={0} max={100} value={draft.page.look.intensity} onChange={(e) => setLook({ intensity: Number(e.target.value) })} className="flex-1 accent-[var(--acc)]" />
                    </label>
                  )}
                </div>
                <div>
                  <p className={label}>Accent</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PAGE_ACCENTS.map((c) => (
                      <button key={c} type="button" aria-label={c} aria-pressed={draft.page.look.accent === c} onClick={() => setLook({ accent: c })} className={cn('grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-[#0b0b0d] transition-transform hover:scale-110', draft.page.look.accent === c && 'ring-2 ring-paper')} style={{ background: c }}>
                        {draft.page.look.accent === c && <Check className={cn('size-3.5', c === '#f3f2ee' || c === '#ffe14d' || c === '#5eff9a' || c === '#4de1ff' ? 'text-black' : 'text-white')} strokeWidth={3} />}
                      </button>
                    ))}
                    <label className="relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-white/30 text-paper/60" title="Any colour">
                      <Plus className="size-3.5" />
                      <input type="color" value={draft.page.look.accent} onChange={(e) => setLook({ accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Any colour" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {tab === 'links' && (
              <div className="grid gap-3">
                <p className="text-[12.5px] leading-relaxed text-paper/45">Icons show in the row under the logo (and in the site footer). Buttons show on /links. Same list as Owner, Socials and links.</p>
                {draft.items.map((l, i) => (
                  <div key={l.id} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex gap-2">
                      <select aria-label="Platform" value={l.platform} onChange={(e) => setItems((all) => all.map((x) => (x.id === l.id ? { ...x, platform: e.target.value } : x)))} className={cn(input, 'w-[46%] shrink-0 px-2 py-2 text-[13px] [color-scheme:dark]')}>
                        {PLATFORMS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <input aria-label="Name" className={cn(input, 'py-2')} value={l.label} maxLength={40} onChange={(e) => setItems((all) => all.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))} />
                    </div>
                    <input aria-label="Address" className={cn(input, 'py-2')} value={l.url} placeholder="https://" onChange={(e) => setItems((all) => all.map((x) => (x.id === l.id ? { ...x, url: e.target.value.trim() } : x)))} />
                    <div className="flex items-center gap-1.5">
                      <Toggle on={l.footer} onClick={() => setItems((all) => all.map((x) => (x.id === l.id ? { ...x, footer: !x.footer } : x)))}>Icon</Toggle>
                      <Toggle on={l.page} onClick={() => setItems((all) => all.map((x) => (x.id === l.id ? { ...x, page: !x.page } : x)))}>Button</Toggle>
                      <span className="flex-1" />
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => setItems((all) => swap(all, i, i - 1))}>
                        <ArrowUp className="size-3.5" />
                      </IconBtn>
                      <IconBtn label="Move down" disabled={i === draft.items.length - 1} onClick={() => setItems((all) => swap(all, i, i + 1))}>
                        <ArrowDown className="size-3.5" />
                      </IconBtn>
                      <IconBtn label="Remove" onClick={() => setItems((all) => all.filter((x) => x.id !== l.id))}>
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                ))}
                {draft.items.length < MAX_LINKS && (
                  <button type="button" onClick={() => setItems((all) => [...all, { id: `l${Math.random().toString(36).slice(2, 9)}`, platform: 'website', label: 'New link', url: 'https://', footer: false, page: true }])} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 text-[13.5px] text-paper/70 transition-colors hover:border-white/40 hover:text-paper">
                    <Plus className="size-4" />
                    Add a link
                  </button>
                )}
              </div>
            )}
          </div>

          <footer className="border-t border-white/8 px-5 pt-3 pb-4">
            <div className="mb-3 flex items-center gap-2 text-[12.5px] text-paper/50">
              Preview as
              <div className="flex rounded-pill border border-white/12 p-0.5">
                {(['soon', 'live'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-pill px-2.5 py-1 transition-colors', mode === m ? 'bg-white/12 text-paper' : 'hover:text-paper')}>
                    {m === 'soon' ? 'Coming soon' : 'Open'}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p role="alert" className="mb-2 text-[12.5px] text-red-300">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={!dirty || busy} onClick={() => setDraft(saved)} className="h-11 rounded-pill border border-white/12 px-4 text-[14px] text-paper/70 transition-colors hover:border-white/30 hover:text-paper disabled:opacity-40">
                Undo changes
              </button>
              <button type="button" disabled={!dirty || busy} onClick={save} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-pill bg-paper text-[14px] font-medium text-ink transition-opacity disabled:opacity-40">
                {busy ? <Loader2 className="size-4 animate-spin" /> : done ? <Check className="size-4" strokeWidth={3} /> : null}
                {done ? 'Saved' : 'Save'}
              </button>
            </div>
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

const swap = <T,>(a: T[], i: number, j: number) => {
  const b = [...a]
  ;[b[i], b[j]] = [b[j], b[i]]
  return b
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-paper/40 uppercase">{title}</p>
      {children}
    </section>
  )
}

function Field({ w, value, onChange }: { w: (typeof WORDS)[number]; value: string; onChange: (v: string) => void }) {
  const id = `ed-${w.key}`
  return (
    <div>
      <label className={label} htmlFor={id}>
        {w.label}
      </label>
      {w.long ? <textarea id={id} rows={2} className={cn(input, 'resize-none')} value={value} maxLength={COPY_MAX[w.key]} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className={input} value={value} maxLength={COPY_MAX[w.key]} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

function Swatch({ on, onClick, label: name, title, style }: { on: boolean; onClick: () => void; label: string; title?: string; style: React.CSSProperties }) {
  return (
    <button type="button" aria-pressed={on} title={title ?? name} onClick={onClick} className={cn('relative aspect-[4/3] overflow-hidden rounded-xl text-left ring-offset-2 ring-offset-[#0b0b0d] transition-transform hover:scale-[1.03]', on ? 'ring-2 ring-paper' : 'ring-1 ring-white/10')} style={style}>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5 text-[11px] text-paper/85">{name}</span>
    </button>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn('rounded-pill border px-2.5 py-1 text-[12px] transition-colors', on ? 'border-paper/60 bg-paper/10 text-paper' : 'border-white/12 text-paper/45 hover:text-paper')}>
      {children}
    </button>
  )
}

function IconBtn({ label: name, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={name} title={name} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-full text-paper/55 transition-colors hover:bg-white/8 hover:text-paper disabled:opacity-30">
      {children}
    </button>
  )
}
