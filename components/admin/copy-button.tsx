'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/** Copies text and says so for two seconds. */
export function CopyButton({ text, label = 'Copy', done = 'Copied', className }: { text: string; label?: string; done?: string; className?: string }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const t = document.createElement('textarea')
      t.value = text
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setOk(true)
    toast.ok('Copied')
    window.setTimeout(() => setOk(false), 2000)
  }
  return (
    <button type="button" onClick={copy} className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-xs transition-colors hover:bg-paper/10', ok && 'border-emerald-400/50 text-emerald-300', className)}>
      {ok ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {ok ? done : label}
    </button>
  )
}
