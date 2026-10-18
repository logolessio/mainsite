'use client'

import { Loader2, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { runSiteCheck } from '@/lib/site-check-client'
import { askAdminSecret } from './secret-dialog'

const KEYS = ['payouts_paused', 'submissions_paused', 'signups_paused'] as const

/** One press to stop withdrawals, new clips and sign-ups (or to open them all again). Needs the admin password. */
export function LockdownButton({ locked }: { locked: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const flip = async () => {
    const next = !locked
    if (next && !window.confirm('Stop withdrawals, new clips and new sign-ups for everyone right now?')) return
    const pass = await askAdminSecret(next ? 'This stops withdrawals, new clips and sign-ups for everyone.' : 'This opens withdrawals, clips and sign-ups again.')
    if (!pass) return
    setBusy(true)
    setError('')
    try {
      for (const key of KEYS) {
        const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value: next ? '1' : '0', secret: pass }) })
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not change that.')
      }
      runSiteCheck(next ? 'lockdown switched on' : 'lockdown lifted')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change that.')
    }
    setBusy(false)
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={flip} disabled={busy} className={`inline-flex h-10 items-center gap-2 rounded-pill border px-5 text-sm transition-colors disabled:opacity-40 ${locked ? 'border-paper bg-paper text-ink hover:bg-paper/85' : 'border-signal/50 text-signal hover:bg-signal/10'}`}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />} {locked ? 'Lift lockdown' : 'Lock everything down'}
      </button>
      {error && <span role="alert" className="text-sm text-signal">{error}</span>}
    </div>
  )
}
