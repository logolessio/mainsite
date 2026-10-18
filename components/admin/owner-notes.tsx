'use client'

import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/app/ui'

type State = 'idle' | 'saving' | 'saved' | 'error'

/** A private notepad on the overview: things to do, things to ask, numbers to remember. Saved by itself a moment after typing stops. */
export function OwnerNotes({ initial }: { initial: string }) {
  const [text, setText] = useState(initial)
  const [state, setState] = useState<State>('idle')
  const saved = useRef(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(text)
  latest.current = text

  const save = async (value: string) => {
    setState('saving')
    const res = await fetch('/api/admin/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: value }) }).catch(() => null)
    if (!res?.ok) return setState('error')
    saved.current = value
    setState(latest.current === value ? 'saved' : 'idle')
  }

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        if (latest.current !== saved.current) void fetch('/api/admin/notes', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: latest.current }) })
      }
    },
    [],
  )

  const change = (v: string) => {
    setText(v.slice(0, 4000))
    setState('idle')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void save(v.slice(0, 4000))
    }, 900)
  }

  return (
    <Card title="Notes">
      <label className="block">
        <span className="sr-only">Private notes</span>
        <textarea
          value={text}
          onChange={(e) => change(e.target.value)}
          rows={7}
          placeholder="Things to do, to ask, to remember. Only admins can see this."
          className="w-full resize-y rounded-2xl border border-line-strong bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-mute/60 focus:border-paper"
        />
      </label>
      <p role="status" aria-live="polite" className="mt-2 flex min-h-5 items-center gap-1.5 text-xs text-mute">
        {state === 'saving' && (
          <>
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> Saving
          </>
        )}
        {state === 'saved' && (
          <>
            <Check aria-hidden="true" className="size-3.5 text-emerald-400" /> Saved
          </>
        )}
        {state === 'error' && <span className="text-signal">Could not save. Your text is still here.</span>}
        {state === 'idle' && text !== saved.current && 'Typing…'}
      </p>
    </Card>
  )
}
