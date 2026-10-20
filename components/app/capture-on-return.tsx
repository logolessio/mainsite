'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { captureDeposit, cents } from '@/lib/finance-client'

/** Shown when someone comes back from PayPal: it finishes the payment, then reloads the page with their new balance. */
export function CaptureOnReturn({ orderId, back }: { orderId: string; back?: string }) {
  const router = useRouter()
  const ran = useRef(false)
  const [state, setState] = useState<{ st: 'working' | 'done' | 'bad'; text: string }>({ st: 'working', text: 'Finishing your payment' })
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    captureDeposit(orderId)
      .then((r) => {
        setState({ st: 'done', text: `${cents(r.amount)} was added to your balance.` })
        window.setTimeout(() => router.replace(back && /^\/(?!\/)/.test(back) ? `${back}${back.includes('?') ? '&' : '?'}paid=1` : '/brand/billing?funded=1'), 1400)
      })
      .catch((e) => setState({ st: 'bad', text: e instanceof Error ? e.message : 'We could not finish that payment.' }))
  }, [orderId, router, back])
  return (
    <p role="status" className={state.st === 'bad' ? 'mb-4 rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal' : 'mb-4 flex items-center gap-2 rounded-2xl border border-line-strong px-4 py-3 text-sm'}>
      {state.st === 'working' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {state.text}
    </p>
  )
}
