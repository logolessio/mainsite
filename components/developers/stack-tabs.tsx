'use client'

import { useEffect, useState } from 'react'
import type { Stack } from '@/lib/dev-snippets'
import { cn } from '@/lib/utils'
import { CodeBlock } from './code-block'

/** Copyable code for the common stacks, one tab each. Remembers the last tab in the address (#stack-react) so it can be shared. */
export function StackTabs({ stacks }: { stacks: Stack[] }) {
  const [id, setId] = useState(stacks[0].id)
  useEffect(() => {
    const h = window.location.hash.replace('#stack-', '')
    if (stacks.some((s) => s.id === h)) setId(h)
  }, [stacks])
  const s = stacks.find((x) => x.id === id) ?? stacks[0]
  return (
    <div>
      <div role="tablist" aria-label="Choose your stack" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {stacks.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === s.id}
            aria-controls="stack-panel"
            onClick={() => {
              setId(t.id)
              history.replaceState(null, '', `#stack-${t.id}`)
            }}
            className={cn('h-10 shrink-0 rounded-pill border px-4 text-sm whitespace-nowrap transition-colors', t.id === s.id ? 'border-paper bg-paper text-ink' : 'border-line-strong text-paper/75 hover:border-paper/60')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="stack-panel" role="tabpanel" aria-labelledby={`tab-${s.id}`} className="mt-5">
        <p className="max-w-3xl text-[15px] leading-relaxed text-paper/70">{s.intro}</p>
        <dl className="mt-4 grid gap-3 rounded-2xl border border-line p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-mute">When you register, choose</dt>
            <dd className="mt-1">{s.kind}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-mute">Return address to add while you build</dt>
            <dd className="mt-1 truncate font-mono text-[13px]" title={s.redirect}>
              {s.redirect}
            </dd>
          </div>
        </dl>
        {s.install && <CodeBlock label="Terminal" code={s.install} />}
        {s.files.map((f) => (
          <CodeBlock key={f.file} label={f.file} code={f.code} />
        ))}
      </div>
    </div>
  )
}
