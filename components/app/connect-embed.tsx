'use client'

import { Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { startEmbed } from '@/lib/connect-embed'

/**
 * Stripe's identity and bank form, shown inside logoless and styled to match the site. Stripe still collects and
 * checks everything, so we never see ID numbers or full bank details. `onUnavailable` is called when it cannot start
 * (not switched on, blocked, offline), so the caller can use Stripe's own page instead.
 */
export function ConnectOnboarding({ onDone, onUnavailable }: { onDone: () => void; onUnavailable: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const done = useRef(onDone)
  const unavailable = useRef(onUnavailable)
  done.current = onDone
  unavailable.current = onUnavailable

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const instance = await startEmbed('onboarding')
        if (cancelled || !host.current) return
        const el = instance.create('account-onboarding')
        el.setOnExit(() => done.current())
        el.setOnLoadError(() => {
          if (!cancelled) unavailable.current()
        })
        el.setOnLoaderStart(() => setReady(true))
        host.current.replaceChildren(el)
      } catch {
        if (!cancelled) unavailable.current()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative rounded-3xl border border-line-strong bg-white/[0.02] p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-mute">Stripe checks your identity and keeps your bank details. We never see them.</p>
        <button type="button" onClick={() => done.current()} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-paper">
          <X className="size-4" />
        </button>
      </div>
      {!ready && (
        <p className="flex items-center gap-2 py-10 text-sm text-mute">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading the secure form…
        </p>
      )}
      <div ref={host} className="min-h-24" />
    </div>
  )
}

type Part = { id: 'notification-banner' | 'balances' | 'payouts' | 'account-management'; title?: string; sub?: string }
const PARTS: Part[] = [
  { id: 'notification-banner' },
  { id: 'balances', title: 'Stripe balance', sub: 'Money Stripe is holding for you before it goes to your bank.' },
  { id: 'payouts', title: 'Payouts to your bank', sub: 'Every transfer to your bank, with its status.' },
  { id: 'account-management', title: 'Your details', sub: 'Your name, address, ID and bank account.' },
]

/** The clipper's Stripe dashboard, built from Stripe's embedded components so it lives on logoless. */
export function ConnectManage() {
  const refs = useRef<Record<string, HTMLDivElement | null>>({})
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const instance = await startEmbed('manage')
        if (cancelled) return
        for (const p of PARTS) refs.current[p.id]?.replaceChildren(instance.create(p.id))
        setState('ready')
      } catch {
        if (!cancelled) setState('failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'failed') return <p className="rounded-2xl border border-line-strong px-4 py-3 text-sm text-mute">Your Stripe details could not load right now. Refresh the page to try again.</p>
  return (
    <div className="grid gap-6">
      {state === 'loading' && (
        <p className="flex items-center gap-2 text-sm text-mute">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading your Stripe account…
        </p>
      )}
      {PARTS.map((p) => (
        <section key={p.id} className={p.title ? 'rounded-3xl border border-line-strong p-5 md:p-6' : undefined}>
          {p.title && (
            <div className="mb-4">
              <h3 className="font-display text-xl">{p.title}</h3>
              <p className="mt-1 text-sm text-mute">{p.sub}</p>
            </div>
          )}
          <div
            ref={(el) => {
              refs.current[p.id] = el
            }}
          />
        </section>
      ))}
    </div>
  )
}
