'use client'

import { Check, Copy, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Toggle } from './ui'
import { ActionButton, Card } from './ui'

type State = { linked: boolean; dm: boolean; botReady: boolean; serverConfigured: boolean }

async function call(data: object) {
  const res = await fetch('/api/me/discord', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string; minutes?: number; note?: string; ok?: boolean; added?: string[]; removed?: string[] }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

/** Connect Discord: get a code to type into the bot, switch its direct messages on or off, refresh your roles. */
export function DiscordCard() {
  const [s, setS] = useState<State | null>(null)
  const [code, setCode] = useState<{ code: string; minutes: number } | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const load = useCallback(() => {
    fetch('/api/me/discord', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setS(j))
      .catch(() => setS(null))
  }, [])
  useEffect(load, [load])
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
            <ActionButton variant="ghost" disabled={Boolean(busy)} onClick={() => run('unlink', async () => { await call({ action: 'unlink' }); setCode(null); load() })}>
              Disconnect
            </ActionButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {!s.botReady && <p className="text-sm text-mute">The server bot is not switched on yet. You can still get a code now.</p>}
          {code ? (
            <div className="grid gap-3">
              <p className="text-sm text-mute">Type this in the logoless server (it works once, for {code.minutes} minutes):</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="rounded-2xl bg-white/[0.06] px-4 py-3 font-mono text-lg tracking-[0.25em]">/link {code.code}</code>
                <button type="button" aria-label="Copy" className="grid size-10 place-items-center rounded-full border border-line-strong hover:bg-paper/10" onClick={() => navigator.clipboard.writeText(`/link ${code.code}`).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}>
                  {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-mute">Signed in with Discord on logoless? You are already connected.</p>
            </div>
          ) : (
            <div>
              <ActionButton disabled={Boolean(busy)} onClick={() => run('code', async () => { const j = await call({ action: 'code' }); setCode({ code: j.code ?? '', minutes: j.minutes ?? 15 }) })}>
                {busy === 'code' && <Loader2 className="size-4 animate-spin" />} Connect Discord
              </ActionButton>
            </div>
          )}
        </div>
      )}
      {msg && <p role="status" className="mt-3 text-sm text-mute">{msg}</p>}
    </Card>
  )
}
