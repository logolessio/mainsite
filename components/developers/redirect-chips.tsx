'use client'

import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { type ClientType, LIMITS, checkRedirectUri } from '@/lib/dev-app-rules'
import { cn } from '@/lib/utils'

/**
 * Return addresses as chips: type or paste one, press Enter (or Add), and it becomes a chip once it passes the same check the
 * server runs. Each chip has its own remove button. Pasting several lines adds each of them.
 */
export function RedirectChips({ value, onChange, type, error, onBlur, describedBy, inputId }: { value: string[]; onChange: (v: string[]) => void; type: ClientType; error?: string; onBlur?: () => void; describedBy?: string; inputId?: string }) {
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState('')
  const auto = useId()
  const id = inputId ?? auto

  const add = (raw: string) => {
    const parts = raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    const bad: string[] = []
    for (const p of parts) {
      const r = checkRedirectUri(p, type)
      if ('problem' in r) {
        bad.push(parts.length > 1 ? `${p}: ${r.problem}` : r.problem)
        continue
      }
      if (next.includes(r.ok)) {
        bad.push(parts.length > 1 ? `${p}: already added.` : 'That address is already added.')
        continue
      }
      if (next.length >= LIMITS.redirects) {
        bad.push(`Up to ${LIMITS.redirects} return addresses.`)
        break
      }
      next.push(r.ok)
    }
    if (next.length !== value.length) onChange(next)
    setProblem(bad[0] ?? '')
    setDraft(bad.length && parts.length === 1 ? raw : '')
  }

  const shown = problem || error
  return (
    <div>
      {value.length > 0 && (
        <ul aria-label="Return addresses" className="mb-3 flex flex-wrap gap-2">
          {value.map((u) => {
            const r = checkRedirectUri(u, type)
            const tag = 'ok' in r ? (r.dev ? 'for development' : r.native ? 'app link' : null) : 'not valid'
            return (
              <li key={u} className={cn('flex max-w-full items-center gap-2 rounded-pill border py-1 pr-1 pl-3.5 text-sm', 'problem' in r ? 'border-signal/60 bg-signal/[0.06]' : 'border-line-strong bg-white/[0.04]')}>
                <span className="min-w-0 truncate font-mono text-[12.5px]" title={u}>
                  {u}
                </span>
                {tag && <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[10.5px]', 'problem' in r ? 'text-signal' : 'bg-white/[0.07] text-mute')}>{tag}</span>}
                <button type="button" onClick={() => onChange(value.filter((x) => x !== u))} aria-label={`Remove ${u}`} className="grid size-7 shrink-0 place-items-center rounded-pill text-mute transition-colors hover:bg-paper/10 hover:text-paper">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(shown) || undefined}
          aria-describedby={describedBy}
          disabled={value.length >= LIMITS.redirects}
          placeholder={value.length >= LIMITS.redirects ? `That is the most (${LIMITS.redirects}).` : value.length ? 'Add another address' : 'https://example.com/auth/callback'}
          onChange={(e) => {
            setDraft(e.target.value)
            if (problem) setProblem('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(draft)
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (/[\s,]/.test(text.trim())) {
              e.preventDefault()
              add(text)
            }
          }}
          onBlur={() => {
            if (draft.trim()) add(draft)
            onBlur?.()
          }}
          className={cn('h-12 min-w-0 flex-1 rounded-2xl border bg-ink/80 px-4 font-mono text-sm outline-none transition-colors placeholder:font-sans placeholder:text-mute/70 focus:border-paper', shown ? 'border-signal/70' : 'border-line-strong')}
        />
        <button type="button" onClick={() => add(draft)} disabled={!draft.trim()} className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-line-strong px-4 text-sm transition-colors hover:bg-paper/10 disabled:opacity-40">
          <Plus aria-hidden="true" className="size-4" /> Add
        </button>
      </div>
      {shown && (
        <p role="alert" className="mt-2 text-sm text-signal">
          {shown}
        </p>
      )}
    </div>
  )
}
