'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { FACES, type Face, type FontKind, type Role, ROLES, faceById } from '@/lib/fonts'
import { toast } from '@/lib/toast'
import { FontDial } from './font-dial'

type Kind = 'all' | FontKind
const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
]

const root = () => document.documentElement

/** Shows a choice on the page being looked at right now, before it is saved, so the whole dashboard turns into it as the dial turns. */
function paint(role: Role, face: Face | null, preset: { body: string; display: string }) {
  const r = ROLES.find((x) => x.id === role)!
  const el = root()
  if (role === 'headline' || role === 'body') {
    const v = face?.var ?? (role === 'body' ? preset.body : preset.display)
    el.style.setProperty(r.cssVar, `var(${v})`)
    if (role === 'headline') {
      if (face) el.dataset.kind = face.kind
    }
  } else if (face) {
    el.style.setProperty(r.cssVar, `var(${face.var})`)
    if (role === 'ui') el.dataset.ui = '1'
    if (role === 'figures') el.dataset.figures = '1'
  } else {
    el.style.removeProperty(r.cssVar)
    if (role === 'ui') delete el.dataset.ui
    if (role === 'figures') delete el.dataset.figures
  }
}

/**
 * One dial of typefaces for each job: headlines, body text, buttons and menus, big numbers, and code. Turning a dial changes the whole
 * dashboard under it at once and is saved for everyone a moment after it stops.
 */
export function FontRoles({ initial, preset }: { initial: Record<Role, string>; preset: { body: string; display: string } }) {
  const [vals, setVals] = useState<Record<Role, string>>(initial)
  const [kinds, setKinds] = useState<Record<Role, Kind>>({ headline: 'serif', body: 'sans', ui: 'sans', figures: 'serif', mono: 'mono' })
  const [saving, setSaving] = useState<Role | null>(null)
  const timers = useRef<Partial<Record<Role, ReturnType<typeof setTimeout>>>>({})

  // what each job shows when it has not been given a face: the preset's own
  const shown = useMemo(() => {
    const fallback = (r: Role) => (r === 'body' || r === 'ui' ? preset.body : r === 'mono' ? '--font-mono-face' : preset.display)
    return Object.fromEntries(ROLES.map((r) => [r.id, faceById(vals[r.id])?.var ?? fallback(r.id)])) as Record<Role, string>
  }, [vals, preset])

  useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach((x) => x && clearTimeout(x))
  }, [])

  const save = (role: Role, id: string) => {
    const key = ROLES.find((r) => r.id === role)!.setting
    if (timers.current[role]) clearTimeout(timers.current[role])
    setSaving(role)
    timers.current[role] = setTimeout(async () => {
      const res = await fetch('/api/dev/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value: id }) }).catch(() => null)
      setSaving(null)
      if (!res?.ok) toast.error('That typeface could not be saved.')
    }, 650)
  }

  const choose = (role: Role, id: string) => {
    setVals((v) => ({ ...v, [role]: id }))
    paint(role, faceById(id), preset)
    save(role, id)
  }

  return (
    <div className="grid gap-5">
      {ROLES.map((r) => {
        const kind = kinds[r.id]
        const list = FACES.filter((f) => kind === 'all' || f.kind === kind)
        const current = faceById(vals[r.id])
        return (
          <section key={r.id} aria-label={r.label} className="overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03]">
            <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-2 md:px-9 md:pt-8">
              <div className="min-w-0">
                <h3 className="font-display text-[1.7rem] leading-tight">{r.label}</h3>
                <p className="mt-1 text-[14px] text-paper/50">{r.hint}</p>
              </div>
              <div className="flex items-center gap-4">
                {saving === r.id && <Loader2 aria-label="Saving" className="size-4 animate-spin text-paper/50" />}
                <p className="text-[13.5px] text-paper/60">{current ? current.label : 'Follows the preset'}</p>
                {current && (
                  <button type="button" onClick={() => choose(r.id, '')} className="text-[13px] text-paper/50 underline underline-offset-4 transition-colors hover:text-paper">
                    Use the preset
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 pt-4 md:px-9">
              <p className="min-h-[3.4rem] truncate text-[clamp(1.7rem,3.2vw,2.8rem)] leading-tight" style={{ fontFamily: `var(${shown[r.id]}), ui-sans-serif, system-ui, sans-serif`, fontWeight: current?.kind === 'mono' || (!current && r.id === 'mono') ? 500 : 400 }}>
                {r.sample}
              </p>
            </div>
            <div className="flex justify-center px-6 pt-4 md:px-9">
              <GlassTabs compact label={`Kind of typeface for ${r.label}`} value={kind} onChange={(k) => setKinds((s) => ({ ...s, [r.id]: k as Kind }))} tabs={KINDS.map((k) => ({ id: k.id, label: k.label }))} />
            </div>
            <div className="pt-2 pb-6">
              <FontDial label={`${r.label} typeface`} faces={list} value={current && list.some((f) => f.id === current.id) ? current.id : null} onChange={(id) => choose(r.id, id)} />
            </div>
          </section>
        )
      })}
    </div>
  )
}
