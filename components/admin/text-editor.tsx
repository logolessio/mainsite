'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, RotateCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { copyKey, norm } from '@/lib/copy-key'
import { applyWording } from '@/lib/wording'
import { seenCopy, useCopy } from '@/components/shell/copy-provider'
import { ToolsMenu } from './tools-menu'
import { cn } from '@/lib/utils'

type Target = { key: string; original: string; current: string }

/**
 * Admin only. A switch in the corner turns on text editing: every sentence we know about gets an outline, and clicking one
 * opens a box to change it. The same text can also be edited from the "Site text" list in the admin area.
 */
export function TextEditor() {
  const { isAdmin, editing, setEditing, overrides } = useCopy()
  const router = useRouter()
  const [target, setTarget] = useState<Target | null>(null)
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const marked = useRef(new Set<Element>())

  const mark = useCallback(() => {
    for (const el of marked.current) {
      el.removeAttribute('data-copy-key')
    }
    marked.current.clear()
    const index = new Map<string, { key: string; original: string }>()
    for (const [key, original] of seenCopy) index.set(norm(overrides[key] ?? applyWording(original)), { key, original })
    const root = document.body
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => ((n as Element).closest('[data-text-editor]') || ['SCRIPT', 'STYLE', 'SVG', 'CANVAS'].includes((n as Element).tagName.toUpperCase()) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    const hits: [Element, string][] = []
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n as Element
      // Headlines that animate word by word are built from separate spans, so they carry the full sentence as their label.
      const label = norm(el.getAttribute('aria-label') ?? '')
      const text = label && index.has(label) ? label : norm(el.textContent ?? '')
      if (text && index.has(text)) hits.push([el, text])
    }
    // keep only the deepest element for each match
    for (const [el, text] of hits) {
      if (hits.some(([other, t2]) => other !== el && t2 === text && el.contains(other))) continue
      el.setAttribute('data-copy-key', index.get(text)!.key)
      marked.current.add(el)
    }
  }, [overrides])

  useEffect(() => {
    if (!editing) {
      for (const el of marked.current) el.removeAttribute('data-copy-key')
      marked.current.clear()
      return
    }
    mark()
    let t: ReturnType<typeof setTimeout> | null = null
    const mo = new MutationObserver(() => {
      if (t) clearTimeout(t)
      t = setTimeout(mark, 400)
    })
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest('[data-copy-key]')
      if (!el || (e.target as Element).closest('[data-text-editor]')) return
      e.preventDefault()
      e.stopPropagation()
      const key = el.getAttribute('data-copy-key')!
      const original = seenCopy.get(key) ?? ''
      const current = overrides[key] ?? applyWording(original)
      setTarget({ key, original, current })
      setValue(current)
      setReason('')
      setError('')
    }
    document.addEventListener('click', onClick, true)
    return () => {
      mo.disconnect()
      if (t) clearTimeout(t)
      document.removeEventListener('click', onClick, true)
    }
  }, [editing, mark, overrides])

  if (!isAdmin) return null

  const send = async (action: 'save' | 'reset') => {
    if (!target) return
    setBusy(true)
    setError('')
    // make sure the server knows this text before editing it
    await fetch('/api/admin/content/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ key: target.key, original: target.original, page: location.pathname }] }) }).catch(() => {})
    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, key: target.key, value, reason: reason || undefined }),
    }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setError(j?.error ?? 'Could not save.')
    setTarget(null)
    router.refresh()
  }

  return (
    <div data-text-editor>
      <style>{`[data-copy-key]{outline:1px dashed rgb(255 77 77 / .7);outline-offset:3px;cursor:text;border-radius:4px}[data-copy-key]:hover{outline:2px solid #ff4d4d;background:rgb(255 77 77 / .08)}`}</style>
      <ToolsMenu />

      <AnimatePresence>
        {target && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] grid place-items-center bg-black/70 px-4">
            <motion.div initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="w-full max-w-lg rounded-[calc(28px*var(--round,1))] border border-line-strong bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-2xl">Edit text</p>
                <button type="button" aria-label="Close" onClick={() => setTarget(null)} className="grid size-9 place-items-center rounded-pill hover:bg-paper/10">
                  <X className="size-4" />
                </button>
              </div>
              <label className="mt-4 block font-mono text-xs text-mute" htmlFor="te-v">New wording</label>
              <textarea id="te-v" value={value} onChange={(e) => setValue(e.target.value)} rows={4} maxLength={2000} className="mt-1.5 w-full rounded-2xl border border-line-strong bg-ink/80 p-3 text-sm focus:outline-none" />
              <label className="mt-3 block font-mono text-xs text-mute" htmlFor="te-r">Why are you changing it? (optional, saved in the log)</label>
              <input id="te-r" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="mt-1.5 h-10 w-full rounded-pill border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
              {target.current !== target.original && <p className="mt-3 text-xs text-mute">Original: {target.original}</p>}
              {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" disabled={busy || !value.trim() || value === target.current} onClick={() => send('save')} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink disabled:opacity-40">
                  {busy && <Loader2 className="size-4 animate-spin" />} Save
                </button>
                {target.current !== target.original && (
                  <button type="button" disabled={busy} onClick={() => send('reset')} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm hover:bg-paper/10">
                    <RotateCcw className="size-4" /> Back to original
                  </button>
                )}
                <button type="button" onClick={() => setTarget(null)} className="text-sm text-mute hover:text-paper">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { copyKey }
