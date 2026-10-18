'use client'

import { Loader2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Item = { key: string; original: string; override: string | null; page: string }

export function TextRow({ item }: { item: Item }) {
  const router = useRouter()
  const current = item.override ?? item.original
  const [v, setV] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const changed = v.trim() !== current

  const send = async (action: 'save' | 'reset') => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, key: item.key, value: v }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setError(j?.error ?? 'Could not save.')
    if (action === 'reset') setV(item.original)
    router.refresh()
  }

  return (
    <li className="border-b border-line py-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={`t-${item.key}`} className="sr-only">Text</label>
          <textarea id={`t-${item.key}`} value={v} onChange={(e) => setV(e.target.value)} rows={Math.min(5, Math.max(1, Math.ceil(v.length / 70)))} maxLength={2000} className="w-full resize-y rounded-2xl border border-line-strong bg-ink/80 px-3 py-2 text-sm focus:outline-none" />
          <p className="mt-1 text-[11px] text-mute">
            {item.page} {item.override !== null && <span className="text-amber-300">· edited. Original: {item.original}</span>}
          </p>
          {error && <p role="alert" className="text-xs text-signal">{error}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy || !changed || !v.trim()} onClick={() => send('save')} className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper px-4 text-xs font-medium text-ink disabled:opacity-30">
            {busy && <Loader2 className="size-3 animate-spin" />} Save
          </button>
          {item.override !== null && (
            <button type="button" disabled={busy} onClick={() => send('reset')} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs hover:bg-paper/10" title="Back to the original wording">
              <RotateCcw className="size-3" /> Original
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export function HeroVariantsEditor({ value, isDefault }: { value: string; isDefault: boolean }) {
  const router = useRouter()
  const [v, setV] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const send = async (action: 'save' | 'reset') => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/content', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, key: 'hero.variants', value: v }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setError(j?.error ?? 'Could not save.')
    router.refresh()
  }
  return (
    <div>
      <textarea value={v} onChange={(e) => setV(e.target.value)} rows={10} className="w-full rounded-2xl border border-line-strong bg-ink/80 p-3 text-sm focus:outline-none" aria-label="Hero texts, one per line" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || v.trim() === value.trim()} onClick={() => send('save')} className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper px-4 text-xs font-medium text-ink disabled:opacity-30">
          {busy && <Loader2 className="size-3 animate-spin" />} Save list
        </button>
        {!isDefault && (
          <button type="button" disabled={busy} onClick={() => send('reset')} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs hover:bg-paper/10">
            <RotateCcw className="size-3" /> Original list
          </button>
        )}
        {error && <span role="alert" className="text-xs text-signal">{error}</span>}
      </div>
    </div>
  )
}

const ROUTES = ['/', '/welcome', '/how-it-works', '/for-brands', '/for-creators', '/pricing', '/payouts', '/trust', '/faq', '/about', '/contact', '/careers']

/** Opens each public page in a hidden frame so the editor can learn every piece of text on it. */
export function ScanSite() {
  const router = useRouter()
  const [state, setState] = useState<string>('')
  const run = async () => {
    for (let i = 0; i < ROUTES.length; i++) {
      setState(`Reading ${ROUTES[i]} (${i + 1}/${ROUTES.length})`)
      await new Promise<void>((resolve) => {
        const f = document.createElement('iframe')
        f.src = ROUTES[i]
        f.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:900px;opacity:0;pointer-events:none'
        f.setAttribute('aria-hidden', 'true')
        document.body.appendChild(f)
        setTimeout(() => {
          f.remove()
          resolve()
        }, 4500)
      })
    }
    setState('Done')
    router.refresh()
    setTimeout(() => setState(''), 3000)
  }
  return (
    <button type="button" disabled={Boolean(state) && state !== 'Done'} onClick={run} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-sm hover:bg-paper/10 disabled:opacity-60">
      {state || 'Scan the site for text'}
    </button>
  )
}
