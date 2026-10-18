'use client'

import { BadgeCheck, Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/app/ui'
import { cn } from '@/lib/utils'

type App = { id: string; name: string; description: string; website: string; redirectUris: string[]; type: 'confidential' | 'public'; verified: boolean; suspended: boolean; createdAt: number }
type Form = { name: string; description: string; website: string; redirects: string; type: 'confidential' | 'public' }

const input = 'h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper'
const empty: Form = { name: '', description: '', website: '', redirects: '', type: 'confidential' }

async function call(path: string, data?: object) {
  const res = await fetch(path, data ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) } : { cache: 'no-store' })
  const j = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

function Copy1({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs hover:bg-paper/10" onClick={() => navigator.clipboard.writeText(text).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}>
      {done ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />} {done ? 'Copied' : label}
    </button>
  )
}

/** Register apps, see their client id, rotate a secret, change return addresses. */
export function AppManager() {
  const [apps, setApps] = useState<App[] | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [fresh, setFresh] = useState<{ id: string; secret: string } | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      setApps(((await call('/api/developers/apps')) as { apps: App[] }).apps)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your apps.')
      setApps([])
    }
  }, [])
  useEffect(() => void load(), [load])

  const payload = () => ({ name: form.name, description: form.description, website: form.website, redirectUris: form.redirects.split(/\s+/).filter(Boolean), type: form.type })

  const save = async () => {
    setBusy('save')
    setError('')
    try {
      if (editing) await call(`/api/developers/apps/${editing}`, { action: 'update', app: payload() })
      else {
        const j = (await call('/api/developers/apps', payload())) as { app: App; secret: string | null }
        setFresh(j.secret ? { id: j.app.id, secret: j.secret } : null)
      }
      setForm(empty)
      setEditing(null)
      setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    }
    setBusy('')
  }

  const act = async (id: string, action: 'rotate' | 'delete') => {
    if (action === 'delete' && !window.confirm('Delete this app? People who signed in with it will be signed out of it, and it stops working.')) return
    if (action === 'rotate' && !window.confirm('Make a new secret? The old one stops working at once.')) return
    setBusy(`${action}-${id}`)
    setError('')
    try {
      const j = (await call(`/api/developers/apps/${id}`, { action })) as { secret?: string }
      if (action === 'rotate' && j.secret) setFresh({ id, secret: j.secret })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setBusy('')
  }

  const edit = (a: App) => {
    setEditing(a.id)
    setForm({ name: a.name, description: a.description, website: a.website, redirects: a.redirectUris.join('\n'), type: a.type })
    setOpen(true)
    setError('')
  }

  return (
    <div className="grid max-w-3xl gap-6">
      {fresh && (
        <div className="rounded-[calc(1.6rem*var(--round,1))] border border-emerald-400/30 bg-emerald-400/[0.05] p-5">
          <p className="text-sm">Copy this secret now. It is shown once, and we only keep a fingerprint.</p>
          <p className="mt-3 break-all rounded-xl bg-black/40 p-3 font-mono text-xs">{fresh.secret}</p>
          <div className="mt-3 flex gap-2">
            <Copy1 text={fresh.secret} label="Copy the secret" />
            <button type="button" className="h-8 px-3 text-xs text-mute hover:text-paper" onClick={() => setFresh(null)}>
              I saved it
            </button>
          </div>
        </div>
      )}

      <Card
        title="Your apps"
        action={
          !open && (
            <button type="button" onClick={() => (setOpen(true), setEditing(null), setForm(empty))} className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper px-4 text-xs font-medium text-ink hover:bg-paper/85">
              <Plus className="size-3.5" /> New app
            </button>
          )
        }
      >
        {open && (
          <form
            className="mb-6 grid gap-4 rounded-[calc(1.4rem*var(--round,1))] border border-line p-5"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <p className="font-display text-xl">{editing ? 'Edit app' : 'New app'}</p>
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">Name people will see</span>
              <input className={input} value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My creator tool" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">One line about it (optional)</span>
              <input className={input} value={form.description} maxLength={200} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">Website (optional, https)</span>
              <input className={input} value={form.website} maxLength={200} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://example.com" />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs text-mute">Return addresses, one per line. People are sent back to one of these.</span>
              <textarea className={cn(input, 'h-24 py-3 font-mono text-xs')} value={form.redirects} onChange={(e) => setForm({ ...form, redirects: e.target.value })} placeholder={'https://example.com/auth/logoless/callback\nhttp://localhost:3000/auth/callback'} />
            </label>
            {!editing && (
              <fieldset>
                <legend className="mb-2 text-xs text-mute">Kind of app</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['confidential', 'Has a server', 'A website with a backend that can keep a secret.'],
                      ['public', 'Browser or phone only', 'No place to hide a secret. Uses PKCE instead.'],
                    ] as const
                  ).map(([id, t, d]) => (
                    <button key={id} type="button" aria-pressed={form.type === id} onClick={() => setForm({ ...form, type: id })} className={cn('rounded-2xl border p-3 text-left transition-colors', form.type === id ? 'border-paper bg-white/[0.05]' : 'border-line-strong hover:border-paper/50')}>
                      <span className="block text-sm">{t}</span>
                      <span className="block text-xs text-mute">{d}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={busy === 'save'} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-40">
                {busy === 'save' && <Loader2 className="size-4 animate-spin" />} {editing ? 'Save' : 'Make the app'}
              </button>
              <button type="button" className="h-11 px-4 text-sm text-mute hover:text-paper" onClick={() => (setOpen(false), setEditing(null), setForm(empty))}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {error && (
          <p role="alert" className="mb-4 text-sm text-signal">
            {error}
          </p>
        )}
        {apps === null ? (
          <p className="text-sm text-mute">Loading…</p>
        ) : apps.length === 0 && !open ? (
          <p className="text-sm text-mute">No apps yet. Make one to get a client id.</p>
        ) : (
          <ul className="divide-y divide-line">
            {apps.map((a) => (
              <li key={a.id} className="grid gap-3 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg">{a.name}</p>
                  {a.verified && (
                    <span className="inline-flex items-center gap-1 rounded-pill border border-line-strong px-2.5 py-0.5 text-[11px]">
                      <BadgeCheck className="size-3.5" /> Checked
                    </span>
                  )}
                  {a.suspended && <span className="rounded-pill border border-signal/50 px-2.5 py-0.5 text-[11px] text-signal">Switched off</span>}
                  <span className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-mute">{a.type === 'confidential' ? 'Server app' : 'Browser or phone app'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs">{a.id}</code>
                  <Copy1 text={a.id} label="Copy client id" />
                </div>
                <ul className="text-xs text-mute">
                  {a.redirectUris.map((u) => (
                    <li key={u} className="truncate font-mono">
                      {u}
                    </li>
                  ))}
                </ul>
                {!a.verified && <p className="text-xs text-mute">People see a warning that this app is from an independent developer until logoless checks it. To get it checked, write to us from the contact page.</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => edit(a)} className="h-8 rounded-pill border border-line-strong px-3.5 text-xs hover:bg-paper/10">
                    Edit
                  </button>
                  {a.type === 'confidential' && (
                    <button type="button" disabled={busy === `rotate-${a.id}`} onClick={() => act(a.id, 'rotate')} className="h-8 rounded-pill border border-line-strong px-3.5 text-xs hover:bg-paper/10 disabled:opacity-40">
                      New secret
                    </button>
                  )}
                  <button type="button" disabled={busy === `delete-${a.id}`} onClick={() => act(a.id, 'delete')} className="inline-flex h-8 items-center gap-1 rounded-pill border border-signal/50 px-3.5 text-xs text-signal hover:bg-signal/10 disabled:opacity-40">
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
