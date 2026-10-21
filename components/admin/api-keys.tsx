'use client'

import { askConfirm } from './confirm-dialog'
import { Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/app/ui'
import { askAdminSecret } from './secret-dialog'

type Key = { id: string; name: string; scopes: string[]; createdAt: number; createdBy: string; lastUsed: number | null }
type Scope = { id: string; label: string; hint: string }

const input = 'h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper'
const ago = (t: number | null) => {
  if (!t) return 'never'
  const s = Math.floor(Date.now() / 1000) - t
  return s < 90 ? 'just now' : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 129600 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} days ago`
}

async function call(data: object) {
  const res = await fetch('/api/admin/api-keys', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; key?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-xs hover:bg-paper/10" onClick={() => navigator.clipboard.writeText(text).then(() => (setDone(true), setTimeout(() => setDone(false), 1800)))}>
      {done ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />} {done ? 'Copied' : label}
    </button>
  )
}

/** Make, see and revoke keys for the owner API. A new key is shown once. */
export function ApiKeys({ base, prompt }: { base: string; prompt: string }) {
  const [keys, setKeys] = useState<Key[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [name, setName] = useState('Base44')
  const [pick, setPick] = useState<string[]>(['read', 'moderate', 'message'])
  const [fresh, setFresh] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/api-keys', { cache: 'no-store' })
    if (!res.ok) return
    const j = (await res.json()) as { keys: Key[]; scopes: Scope[] }
    setKeys(j.keys)
    setScopes(j.scopes)
  }, [])
  useEffect(() => void load(), [load])

  const make = async () => {
    const secret = await askAdminSecret('Making a key gives another tool access to your owner data.')
    if (!secret) return
    setBusy('make')
    setError('')
    try {
      const j = await call({ action: 'create', name, scopes: pick, secret })
      setFresh(j.key ?? null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not make the key.')
    }
    setBusy('')
  }
  const revoke = async (id: string) => {
    if (!(await askConfirm({ title: 'Revoke this key?', summary: ['Anything using it stops working straight away.', 'A revoked key cannot be switched back on; you would make a new one.'], action: 'Revoke it', danger: true }))) return
    const secret = await askAdminSecret('Revoking stops that key working straight away.')
    if (!secret) return
    setBusy(id)
    try {
      await call({ action: 'revoke', id, secret })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not revoke it.')
    }
    setBusy('')
  }

  return (
    <div className="grid max-w-4xl gap-6">
      <Card title="Keys" sub="A key lets another tool, like a dashboard built in Base44, do your admin work from anywhere. It cannot send money, ban or delete people, change roles or change site-wide switches.">
        {fresh && (
          <div className="mb-6 rounded-card border border-emerald-400/30 bg-emerald-400/[0.05] p-4">
            <p className="text-sm">Copy this key now. It is shown once and cannot be shown again.</p>
            <p className="mt-3 break-all rounded-panel bg-black/40 p-3 font-mono text-xs">{fresh}</p>
            <div className="mt-3 flex gap-2">
              <CopyButton text={fresh} label="Copy the key" />
              <button type="button" className="h-9 rounded-pill px-4 text-xs text-mute hover:text-paper" onClick={() => setFresh(null)}>
                I saved it
              </button>
            </div>
          </div>
        )}
        {keys.length === 0 ? (
          <p className="text-sm text-mute">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm">{k.name} <span className="font-mono text-xs text-mute">lgk_{k.id}_…</span></p>
                  <p className="text-xs text-mute">{k.scopes.join(' · ')} · made {ago(k.createdAt)} · last used {ago(k.lastUsed)}</p>
                </div>
                <button type="button" disabled={busy === k.id} onClick={() => revoke(k.id)} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-signal/50 px-4 text-xs text-signal hover:bg-signal/10 disabled:opacity-40">
                  {busy === k.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />} Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Make a key">
        <div className="grid gap-4">
          <label className="grid max-w-sm gap-1.5">
            <span className="text-xs text-mute">Name</span>
            <input className={input} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <fieldset>
            <legend className="mb-2 text-xs text-mute">What it may do</legend>
            <ul className="grid gap-2">
              {scopes.map((s) => (
                <li key={s.id}>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1 size-4 accent-white" checked={pick.includes(s.id)} onChange={(e) => setPick(e.target.checked ? [...pick, s.id] : pick.filter((x) => x !== s.id))} />
                    <span>
                      {s.label}
                      <span className="block text-xs text-mute">{s.hint}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <div>
            <button type="button" disabled={busy === 'make' || name.trim().length < 2 || pick.length === 0} onClick={make} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-40">
              {busy === 'make' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Make the key
            </button>
          </div>
          {error && <p role="alert" className="text-sm text-signal">{error}</p>}
        </div>
      </Card>

      <Card title="Use it" sub="Send the key in a header on every call.">
        <pre className="overflow-x-auto rounded-panel bg-black/40 p-4 font-mono text-xs leading-relaxed text-paper/80">{`curl ${base}/overview \\\n  -H "Authorization: Bearer lgk_YOURKEY"`}</pre>
        <p className="mt-3 text-xs text-mute">GET {base} lists every route. Changes are written to the audit log as “api:&lt;key name&gt;”.</p>
      </Card>

      <Card title="Base44 prompt" sub="Paste this into Base44 to build a copy of this dashboard that works from anywhere. Store the key as a secret, as the prompt explains.">
        <div className="mb-3">
          <CopyButton text={prompt} label="Copy the prompt" />
        </div>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-panel bg-black/40 p-4 font-mono text-xs leading-relaxed text-paper/80">{prompt}</pre>
      </Card>
    </div>
  )
}
