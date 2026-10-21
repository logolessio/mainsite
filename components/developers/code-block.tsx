'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function CopyButton({ text, label = 'Copy', className }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs transition-colors hover:bg-paper/10', className)}
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }
    >
      {done ? <Check aria-hidden="true" className="size-3.5 text-emerald-300" /> : <Copy aria-hidden="true" className="size-3.5" />}
      <span aria-live="polite">{done ? 'Copied' : label}</span>
    </button>
  )
}

/** A block of code with its file name and a copy button. */
export function CodeBlock({ code, label, className }: { code: string; label?: string; className?: string }) {
  return (
    <figure className={cn('my-4 overflow-hidden rounded-2xl border border-line bg-black/60', className)}>
      <figcaption className="flex items-center justify-between gap-3 border-b border-line py-1.5 pr-1.5 pl-4">
        <span className="truncate font-mono text-[11px] text-mute">{label ?? ' '}</span>
        <CopyButton text={code} className="border-transparent" />
      </figcaption>
      <pre className="max-h-[32rem] overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-paper/85">{code}</pre>
    </figure>
  )
}
