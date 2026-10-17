'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ExternalLink, Globe, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { ActionButton, Card, Toggle } from '@/components/app/ui'
import { Input, Select } from '@/components/ui/fields'
import { type LinkItem, MAX_LINKS, PLATFORMS, safeUrl } from '@/lib/socials'
import { useUnsavedGuard } from '@/hooks/use-unsaved-guard'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const same = (a: LinkItem[], b: LinkItem[]) => JSON.stringify(a) === JSON.stringify(b)
const nid = () => `l${Math.random().toString(36).slice(2, 9)}`

/** The one place every social account and link on the site is changed: the footer icons and the logoless.io/links page. */
export function LinksEditor({ initial }: { initial: LinkItem[] }) {
  const [saved, setSaved] = useState(initial)
  const [links, setLinks] = useState(initial)
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const dirty = !same(saved, links)
  useUnsavedGuard(dirty)

  const set = (id: string, patch: Partial<LinkItem>) => setLinks((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const move = (i: number, by: number) =>
    setLinks((l) => {
      const j = i + by
      if (j < 0 || j >= l.length) return l
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  const add = (platform = 'website') => setLinks((l) => [...l, { id: nid(), platform, label: PLATFORMS.find((p) => p.id === platform)?.label ?? 'New link', url: 'https://', footer: platform !== 'website', page: true }])

  const call = async (kind: 'save' | 'reset') => {
    setBusy(kind)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/socials', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(kind === 'reset' ? { reset: true } : { links }) })
      const j = (await res.json().catch(() => ({}))) as { links?: LinkItem[]; error?: string }
      if (!res.ok || !j.links) throw new Error(j.error ?? 'Could not save that.')
      setSaved(j.links)
      setLinks(j.links)
      setMsg({ ok: true, text: kind === 'reset' ? 'Back to the built-in list.' : 'Saved. The footer and the links page are updated.' })
      toast.ok(kind === 'reset' ? 'Back to the built-in list' : 'Saved')
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save that.' })
    }
    setBusy(null)
  }

  const bad = (l: LinkItem) => !l.label.trim() || !safeUrl(l.url.trim())

  return (
    <div className="grid gap-6">
      <Card
        title="Links and socials"
        sub="Every social account and link on the site. The order here is the order everywhere."
        action={
          <a href="/links" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm text-paper/70 transition-colors hover:text-paper">
            View /links <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
        }
      >
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {links.map((l, i) => (
              <motion.li key={l.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className={cn('rounded-2xl border bg-white/[0.02] p-4', bad(l) ? 'border-signal/50' : 'border-line')}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-paper/80">{l.platform === 'website' ? <Globe aria-hidden="true" className="size-[18px]" /> : <BrandIcon name={l.platform} className="size-[18px]" />}</span>
                  <Select aria-label="Where it goes" value={l.platform} onChange={(e) => set(l.id, { platform: e.target.value })} className="h-11 w-44 rounded-full">
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id} className="bg-ink">
                        {p.label}
                      </option>
                    ))}
                  </Select>
                  <Input aria-label="Name shown" value={l.label} maxLength={40} onChange={(e) => set(l.id, { label: e.target.value })} placeholder="Name shown" className="h-11 min-w-0 flex-1 rounded-full sm:min-w-40" />
                  <div className="ml-auto flex items-center gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-9 place-items-center rounded-full text-mute transition-colors hover:bg-white/[0.07] hover:text-paper disabled:opacity-25">
                      <ArrowUp aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === links.length - 1} onClick={() => move(i, 1)} className="grid size-9 place-items-center rounded-full text-mute transition-colors hover:bg-white/[0.07] hover:text-paper disabled:opacity-25">
                      <ArrowDown aria-hidden="true" className="size-4" />
                    </button>
                    <button type="button" aria-label={`Remove ${l.label}`} onClick={() => setLinks((x) => x.filter((y) => y.id !== l.id))} className="grid size-9 place-items-center rounded-full text-mute transition-colors hover:bg-signal/10 hover:text-signal">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <Input aria-label="Address" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} value={l.url} onChange={(e) => set(l.id, { url: e.target.value })} placeholder="https://" className="h-11 min-w-0 flex-1 rounded-full sm:min-w-64" />
                  <label className="flex items-center gap-2.5 text-sm text-paper/70">
                    <Toggle checked={l.footer} onChange={(v) => set(l.id, { footer: v })} label={`Show ${l.label} in the footer`} />
                    Footer
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-paper/70">
                    <Toggle checked={l.page} onChange={(v) => set(l.id, { page: v })} label={`Show ${l.label} on the links page`} />
                    Links page
                  </label>
                </div>
                {bad(l) && <p className="mt-2 text-xs text-signal">Needs a name and an address that starts with https://</p>}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <ActionButton variant="ghost" onClick={() => add('website')} disabled={links.length >= MAX_LINKS}>
            <Plus aria-hidden="true" className="size-4" /> Add a link
          </ActionButton>
          <Select aria-label="Add a social" value="" onChange={(e) => e.target.value && add(e.target.value)} disabled={links.length >= MAX_LINKS} className="h-10 w-48 rounded-full text-sm">
            <option value="" className="bg-ink">
              Add a social…
            </option>
            {PLATFORMS.filter((p) => p.id !== 'website').map((p) => (
              <option key={p.id} value={p.id} className="bg-ink">
                {p.label}
              </option>
            ))}
          </Select>
          <span className="text-xs text-mute">
            {links.length} of {MAX_LINKS}
          </span>
        </div>
      </Card>

      <div className="sticky bottom-24 z-20 flex flex-wrap items-center gap-3 rounded-full border border-line-strong bg-ink/95 p-2 pl-5 md:bottom-6">
        <p role="status" className={cn('min-w-0 flex-1 text-sm', msg ? (msg.ok ? 'text-emerald-300' : 'text-signal') : 'text-mute')}>
          {msg?.text ?? (dirty ? 'You have changes that are not saved yet.' : 'Everything is saved.')}
        </p>
        <ActionButton variant="ghost" onClick={() => call('reset')} disabled={busy !== null}>
          {busy === 'reset' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />} Reset
        </ActionButton>
        <ActionButton onClick={() => call('save')} disabled={!dirty || busy !== null || links.some(bad)}>
          {busy === 'save' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Save changes
        </ActionButton>
      </div>
    </div>
  )
}
