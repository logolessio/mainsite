'use client'

import { Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * Stripe's identity and bank form, shown inside logoless and styled to match the site. Stripe still collects and
 * checks everything, so we never see ID numbers or full bank details. `onUnavailable` is called when the embedded
 * form cannot start (not switched on, blocked, offline), so the caller can use Stripe's own page instead.
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
        const first = await fetch('/api/stripe/connect/session', { method: 'POST', credentials: 'same-origin' })
        const j = (await first.json().catch(() => null)) as { clientSecret?: string; publishableKey?: string } | null
        if (!first.ok || !j?.clientSecret || !j.publishableKey) throw new Error('no session')
        const { loadConnectAndInitialize } = await import('@stripe/connect-js')
        let used = false
        const instance = loadConnectAndInitialize({
          publishableKey: j.publishableKey,
          // Stripe asks for a new secret when the first one expires, so the form keeps working if someone takes a while.
          fetchClientSecret: async () => {
            if (!used) {
              used = true
              return j.clientSecret as string
            }
            const r = await fetch('/api/stripe/connect/session', { method: 'POST', credentials: 'same-origin' })
            const n = (await r.json()) as { clientSecret: string }
            return n.clientSecret
          },
          appearance: {
            overlays: 'dialog',
            variables: {
              colorPrimary: '#f3f2ee',
              colorBackground: '#0b0b0c',
              colorText: '#f3f2ee',
              colorSecondaryText: '#9a9a9f',
              colorBorder: '#2a2a2e',
              colorDanger: '#ff4d4d',
              buttonPrimaryColorBackground: '#f3f2ee',
              buttonPrimaryColorText: '#000000',
              buttonSecondaryColorBackground: '#16161a',
              buttonSecondaryColorText: '#f3f2ee',
              borderRadius: '14px',
              spacingUnit: '11px',
              fontFamily: 'Geist, system-ui, -apple-system, Segoe UI, sans-serif',
              fontSizeBase: '15px',
            },
          },
        })
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
