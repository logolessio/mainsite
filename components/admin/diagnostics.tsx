'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { checkSite } from '@/lib/site-check-client'

type Result = { ok: boolean; title: string; lines: string[] }
type Check = { id: string; label: string; hint: string }

export function Diagnostics({ checks }: { checks: Check[] }) {
  const [results, setResults] = useState<Record<string, Result>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (id: string) => {
    setBusy(id)
    if (id === 'cloudflare') {
      const r = await checkSite('a manual test')
      setResults((s) => ({ ...s, [id]: { ok: r.ok, title: id, lines: [...r.hosts.map((h) => `${h.host}: ${h.note ?? `${h.status} in ${h.ms} ms`}`), `database: ${r.database ? 'answers' : 'not answering'}`] } }))
      setBusy(null)
      return
    }
    if (id === 'headers') {
      // Checked in this browser, on the real response, so it tests exactly what visitors get.
      const res = await fetch('/', { cache: 'no-store' })
      const want = ['content-security-policy', 'strict-transport-security', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy']
      const missing = want.filter((h) => !res.headers.get(h))
      const local = location.hostname === 'localhost'
      const lines = missing.length ? [`Missing: ${missing.join(', ')}`] : [`All ${want.length} security headers are present on the home page.`]
      if (local) lines.push('On localhost, Strict-Transport-Security is expected to be absent.')
      setResults((r) => ({ ...r, [id]: { ok: missing.length === 0 || (local && missing.length === 1 && missing[0] === 'strict-transport-security'), title: id, lines } }))
      setBusy(null)
      return
    }
    const res = await fetch('/api/admin/diagnostics', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ check: id }) }).catch(() => null)
    const j = (await res?.json().catch(() => null)) as (Result & { error?: string }) | null
    setResults((r) => ({ ...r, [id]: res?.ok && j ? j : { ok: false, title: id, lines: [j?.error ?? 'The test could not run.'] } }))
    setBusy(null)
  }
  return (
    <ul className="divide-y divide-line">
      {checks.map((c) => {
        const r = results[c.id]
        return (
          <li key={c.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm">
                {r && (r.ok ? <CheckCircle2 className="size-4 text-emerald-300" /> : <XCircle className="size-4 text-signal" />)}
                {c.label}
              </p>
              <p className="text-xs text-mute">{c.hint}</p>
              {r && (
                <ul className="mt-2 space-y-0.5 text-xs">
                  {r.lines.map((l, i) => (
                    <li key={i} className={r.ok ? 'text-paper/80' : 'text-signal'}>{l}</li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" disabled={busy !== null} onClick={() => run(c.id)} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-xs hover:bg-paper/10 disabled:opacity-40">
              {busy === c.id && <Loader2 className="size-3 animate-spin" />} Run test
            </button>
          </li>
        )
      })}
    </ul>
  )
}
