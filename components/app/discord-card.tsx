'use client'

import { Check, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Toggle } from './ui'
import { ActionButton, Card } from './ui'

type State = { linked: boolean; dm: boolean; botReady: boolean; serverConfigured: boolean }

async function call(data: object) {
  const res = await fetch('/api/me/discord', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; note?: string; ok?: boolean; added?: string[]; removed?: string[] }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

/** Connect Discord with Discord's own approval page (no codes), switch its direct messages on or off, refresh your roles. */
export function DiscordCard() {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    fetch('/api/me/discord', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setS(j))
      .catch(() => setS(null))
  }, [])
  useEffect(load, [load])
  // Discord sends people back to Settings with ?discord=... saying how it went
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('discord')
    const text: Record<string, string> = {
      joined: 'Connected. You are in the server now.',
      linked: 'Connected.',
      taken: 'That Discord account is already connected to a different logoless account.',
      cancelled: 'You did not approve it on Discord, so nothing was connected.',
      setup: 'Connecting is not switched on yet. Try again soon.',
      error: 'That did not work. Please try again.',
    }
    if (r && text[r]) setMsg(text[r])
  }, [])
  if (!s) return null

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setMsg('')
    try {
      await fn()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setBusy('')
  }

  return (
    <Card title="Discord" sub="Connect it to see your numbers, send clips and get your roles in the server. Notifications can arrive there too.">
      {s.linked ? (
        <div className="grid gap-5">
          <p className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-emerald-300" /> Connected.
          </p>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm">Send my notifications as Discord messages</p>
              <p className="text-xs text-mute">Clip decisions, earnings and payouts. Also use /notifications in the server.</p>
            </div>
            <Toggle label="Discord messages" checked={s.dm} onChange={(on) => run('dm', async () => { await call({ action: 'dm', on }); setS({ ...s, dm: on }) })} />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="ghost" disabled={Boolean(busy)} onClick={() => run('sync', async () => { const j = await call({ action: 'sync' }); setMsg(j.note ?? `Roles refreshed: ${j.added?.length ?? 0} added, ${j.removed?.length ?? 0} removed.`) })}>
              {busy === 'sync' && <Loader2 className="size-4 animate-spin" />} Refresh my roles
            </ActionButton>
            <ActionButton variant="ghost" disabled={Boolean(busy)} onClick={() => run('unlink', async () => { await call({ action: 'unlink' }); load() })}>
              Disconnect
            </ActionButton>
          </div>
        </div>
      ) : (
        <div>
          <a href="/api/discord/connect?back=/dashboard/settings" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
            Connect Discord
          </a>
        </div>
      )}
      {msg && <p role="status" className="mt-3 text-sm text-mute">{msg}</p>}
    </Card>
  )
}
