'use client'

import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Health } from '@/lib/health'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const NOTE: Record<string, string> = {
  database: 'Where campaigns, clips and balances live.',
  signin: 'Logging in with Google, Discord or email.',
  payments: 'Taking payments and sending payouts through PayPal.',
  email: 'Sign-up codes and notifications by email.',
}

/** A calm page that says whether everything is running, and checks again when you ask. */
export function StatusBoard({ initial }: { initial: Health }) {
  const [h, setH] = useState(initial)
  const [busy, setBusy] = useState(false)
  const recheck = async () => {
    setBusy(true)
    const res = await fetch('/api/health', { cache: 'no-store' }).catch(() => null)
    const j = (await res?.json().catch(() => null)) as Health | null
    if (j) setH(j)
    setBusy(false)
  }
  return (
    <div className="mx-auto max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT }} className={cn('relative overflow-hidden rounded-[2rem] border p-8 md:p-10', h.ok ? 'border-emerald-400/30 bg-emerald-400/[0.05]' : 'border-amber-300/40 bg-amber-300/[0.06]')}>
        <span className={cn('relative inline-flex size-4 rounded-full', h.ok ? 'bg-emerald-400' : 'bg-amber-300')}>
          <span className={cn('absolute inset-0 animate-ping rounded-full', h.ok ? 'bg-emerald-400/60' : 'bg-amber-300/60')} />
        </span>
        <h1 className="mt-5 font-display text-4xl tracking-tight md:text-5xl">{h.ok ? 'Everything is running.' : "Something's not right."}</h1>
        <p className="mt-3 text-mute">{h.ok ? 'logoless is up. Clips, sign-in and payments are all working.' : "Something's wrong and we're looking into it. Parts of the site may be slow or unavailable."}</p>
        <p className="mt-6 text-xs text-mute">Checked {new Date(h.at * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</p>
      </motion.div>
      <ul className="mt-6 grid gap-3">
        {h.checks.map((c, i) => (
          <motion.li key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 + i * 0.07, ease: EASE_OUT }} className="flex items-center gap-4 rounded-3xl border border-line bg-white/[0.03] px-6 py-5">
            <span className={cn('size-3 shrink-0 rounded-full', c.ok ? 'bg-emerald-400' : 'bg-amber-300')} />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{c.label}</span>
              <span className="block text-sm text-mute">{NOTE[c.id]}</span>
            </span>
            <span className={cn('rounded-full px-3 py-1 text-xs', c.ok ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200')}>{c.ok ? 'Working' : 'Having trouble'}</span>
          </motion.li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="button" onClick={recheck} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm hover:bg-white/10 disabled:opacity-50">
          <RefreshCw className={cn('size-4', busy && 'animate-spin')} /> Check again
        </button>
        <TransitionLink href="/contact" className="text-sm text-mute underline underline-offset-4 hover:text-paper">Report a problem</TransitionLink>
      </div>
    </div>
  )
}
