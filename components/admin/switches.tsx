'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Toggle } from '@/components/app/ui'
import { cn } from '@/lib/utils'
import { askAdminSecret } from './secret-dialog'

async function save(key: string, value: string, secret?: string, endpoint = '/api/admin/settings') {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value, ...(secret ? { secret } : {}) }) })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save.')
}

export function Switch({ k, label, hint, on, danger, endpoint }: { k: string; label: string; hint: string; on: boolean; danger?: boolean; endpoint?: string }) {
  const router = useRouter()
  const [v, setV] = useState(on)
  const [error, setError] = useState('')
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className={cn('text-sm', v && danger && 'text-signal')}>{label}</p>
        <p className="text-xs text-mute">{hint}</p>
        {error && <p role="alert" className="text-xs text-signal">{error}</p>}
      </div>
      <Toggle
        label={label}
        checked={v}
        onChange={async (next) => {
          if (next && danger && !window.confirm(`${label}? This takes effect straight away.`)) return
          // a switch that could stop the company needs the admin password, whichever way it is flipped
          const pass = danger ? await askAdminSecret(`Switching "${label}" ${next ? 'on' : 'off'} affects every member.`) : undefined
          if (danger && !pass) return
          setV(next)
          setError('')
          try {
            await save(k, next ? '1' : '0', pass ?? undefined, endpoint)
            router.refresh()
          } catch (e) {
            setV(!next)
            setError(e instanceof Error ? e.message : 'Could not save.')
          }
        }}
      />
    </li>
  )
}

export function NumberSetting({ k, label, hint, cents }: { k: string; label: string; hint: string; cents: number }) {
  const router = useRouter()
  const [v, setV] = useState(String(cents / 100))
  const [msg, setMsg] = useState('')
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-mute">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-mute">$</span>
        <input value={v} onChange={(e) => setV(e.target.value)} inputMode="numeric" className="h-9 w-28 rounded-full border border-line-strong bg-ink/80 px-3 text-right text-sm focus:outline-none" aria-label={label} />
        <button
          type="button"
          onClick={async () => {
            const n = Math.round(Number(v) * 100)
            if (!Number.isInteger(n) || n < 0) return setMsg('Whole dollars please')
            const pass = await askAdminSecret('Changing a money limit affects every withdrawal.')
            if (!pass) return
            try {
              await save(k, String(n), pass)
              setMsg('Saved')
              router.refresh()
            } catch (e) {
              setMsg(e instanceof Error ? e.message : 'Could not save.')
            }
          }}
          className="h-9 rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10"
        >
          Save
        </button>
        {msg && <span className="text-xs text-mute">{msg}</span>}
      </div>
    </li>
  )
}
