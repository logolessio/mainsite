'use client'

import { ArrowRight, BadgeCheck, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/app/ui'
import { type AppDraft, kindLabel, USE_CASES } from '@/lib/dev-app-rules'
import type { AppUsage, appPublic } from '@/lib/oauth'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { AppForm } from './app-form'
import { CopyButton } from './code-block'
import { RedirectChips } from './redirect-chips'
import { SetupChecker } from './setup-checker'

export type DevApp = ReturnType<typeof appPublic> & { usage: AppUsage }

const n = (v: number) => v.toLocaleString('en-US')
const when = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : 'Never')

function Badges({ app }: { app: DevApp }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-mute">{kindLabel(app.kind)}</span>
      <span className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-mute">{app.type === 'confidential' ? 'Has a secret' : 'PKCE, no secret'}</span>
      {app.verified ? (
        <span className="inline-flex items-center gap-1 rounded-pill border border-line-strong px-2.5 py-0.5 text-[11px]">
          <BadgeCheck aria-hidden="true" className="size-3.5" /> Checked by logoless
        </span>
      ) : (
        <span className="rounded-pill border border-line px-2.5 py-0.5 text-[11px] text-mute">Not checked yet</span>
      )}
      {app.suspended && <span className="rounded-pill border border-signal/50 px-2.5 py-0.5 text-[11px] text-signal">Switched off</span>}
    </div>
  )
}

/** Thirty days of sign-ins as small bars. */
function Bars({ days }: { days: AppUsage['days'] }) {
  const max = Math.max(1, ...days.map((d) => d.n))
  const total = days.reduce((a, b) => a + b.n, 0)
  return (
    <div role="img" aria-label={`Sign-ins over the last 30 days: ${total} in total.`} className="flex h-14 items-end gap-[3px]">
      {days.map((d) => (
        <span key={d.day} title={`${d.day}: ${d.n}`} className={cn('flex-1 rounded-[2px]', d.n ? 'bg-paper/70' : 'bg-white/[0.07]')} style={{ height: d.n ? `${Math.max(10, (d.n / max) * 100)}%` : '6%' }} />
      ))}
    </div>
  )
}

function Stats({ u }: { u: AppUsage }) {
  return (
    <dl className="grid grid-cols-3 gap-4">
      {[
        ['People connected', u.people],
        ['Active, 30 days', u.active30],
        ['Sign-ins, 30 days', u.signIns30],
      ].map(([k, v]) => (
        <div key={k as string}>
          <dt className="text-xs text-mute">{k}</dt>
          <dd className="mt-1 font-display text-3xl tracking-[-0.03em] tabular-nums">{n(v as number)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The Developer page: every app, with its client id and usage at a glance. */
export function AppList({ apps }: { apps: DevApp[] }) {
  return (
    <ul className="grid gap-5 lg:grid-cols-2">
      {apps.map((a) => (
        <li key={a.id}>
          <Card className="h-full">
            <div className="grid gap-5">
              <div className="min-w-0">
                <a href={`/dashboard/developer/${a.id}`} className="text-xl tracking-[-0.01em] hover:underline hover:underline-offset-4">
                  {a.name}
                </a>
                {a.description && <p className="mt-1 text-sm text-mute">{a.description}</p>}
                <div className="mt-3">
                  <Badges app={a} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-tile bg-white/[0.06] px-2.5 py-1.5 font-mono text-xs">{a.id}</code>
                <CopyButton text={a.id} label="Copy client id" />
              </div>
              <Stats u={a.usage} />
              <Bars days={a.usage.days} />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-mute">Last sign-in: {when(a.usage.lastSignIn)}</span>
                <a href={`/dashboard/developer/${a.id}`} className="inline-flex items-center gap-1.5 hover:underline hover:underline-offset-4">
                  Manage <ArrowRight aria-hidden="true" className="size-4" />
                </a>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

async function post(id: string, data: object) {
  const res = await fetch(`/api/developers/apps/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; secret?: string } & Record<string, unknown>
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

/** One app: its keys, return addresses, details, usage, a test, and deleting it. */
export function AppDetail({ app }: { app: DevApp }) {
  const router = useRouter()
  const [secret, setSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ where: string; text: string; ok?: boolean } | null>(null)
  const [uris, setUris] = useState(app.redirectUris)
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState('')
  const urisChanged = uris.join('\n') !== app.redirectUris.join('\n')

  const run = async (where: string, fn: () => Promise<void>) => {
    setBusy(where)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg({ where, text: e instanceof Error ? e.message : 'Something went wrong.' })
    }
    setBusy('')
  }
  const Msg = ({ where }: { where: string }) =>
    msg?.where === where ? (
      <p role={msg.ok ? 'status' : 'alert'} className={cn('mt-3 text-sm', msg.ok ? 'text-emerald-300' : 'text-signal')}>
        {msg.text}
      </p>
    ) : null

  const draft: AppDraft = { name: app.name, description: app.description, website: app.website, kind: app.kind, type: app.type, useCases: app.useCases, useDescription: app.useDescription, redirectUris: app.redirectUris, privacyUrl: app.privacyUrl, termsUrl: app.termsUrl }
  const testRedirect = app.redirectUris.find((u) => u.startsWith('https://')) ?? app.redirectUris[0] ?? ''

  return (
    <div className="grid gap-6">
      <header className="border-b border-line pb-8">
        <a href="/dashboard/developer" className="text-sm text-mute hover:text-paper">
          ← Developer
        </a>
        <h1 className="mt-4 font-display text-4xl leading-[1] tracking-[-0.035em] break-words md:text-[3.2rem]">{app.name}</h1>
        {app.description && <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-paper/55">{app.description}</p>}
        <div className="mt-4">
          <Badges app={app} />
        </div>
      </header>

      {!app.kind && !editing && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.05] p-4 text-sm leading-relaxed">
          This app was made before we asked what it is for. Add those details so we can check it.{' '}
          <button type="button" onClick={() => setEditing(true)} className="underline underline-offset-4">
            Add the details
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Keys" sub="What your code uses to identify the app.">
          <div className="grid gap-5">
            <div>
              <p className="text-sm text-mute">Client id. Public: it goes in your sign-in address.</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-tile bg-white/[0.06] px-2.5 py-1.5 font-mono text-sm break-all">{app.id}</code>
                <CopyButton text={app.id} label="Copy" />
              </div>
            </div>
            {app.type === 'confidential' ? (
              <div>
                <p className="text-sm text-mute">Client secret. Keep it on your server. We only keep a fingerprint, so we cannot show it again.</p>
                {secret ? (
                  <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-4">
                    <p className="text-sm">Your new secret. Copy it now: it is shown once. The old one has stopped working.</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="rounded-tile bg-black/50 px-2.5 py-1.5 font-mono text-xs break-all">{secret}</code>
                      <CopyButton text={secret} label="Copy secret" />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-tile bg-white/[0.06] px-2.5 py-1.5 font-mono text-sm text-mute">lgs_••••••••••••</code>
                    <button
                      type="button"
                      disabled={busy === 'rotate'}
                      onClick={() => {
                        if (!window.confirm('Make a new secret? The old one stops working at once, so update your server straight after.')) return
                        void run('rotate', async () => setSecret(((await post(app.id, { action: 'rotate' })) as { secret: string }).secret))
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs hover:bg-paper/10 disabled:opacity-40"
                    >
                      {busy === 'rotate' ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <KeyRound aria-hidden="true" className="size-3.5" />} Make a new secret
                    </button>
                  </div>
                )}
                <Msg where="rotate" />
              </div>
            ) : (
              <p className="text-sm text-mute">No secret: this app proves itself with PKCE on every sign-in.</p>
            )}
            <div>
              <p className="text-sm text-mute">Issuer, for your library</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded-tile bg-white/[0.06] px-2.5 py-1.5 font-mono text-sm">{SITE.url}</code>
                <CopyButton text={SITE.url} label="Copy" />
              </div>
            </div>
          </div>
        </Card>

        <Card title="Usage" sub="Sign-ins over the last 30 days.">
          <div className="grid gap-5">
            <Stats u={app.usage} />
            <Bars days={app.usage.days} />
            <p className="text-sm text-mute">Last sign-in: {when(app.usage.lastSignIn)}</p>
          </div>
        </Card>
      </div>

      <Card title="Return addresses" sub="Where people are sent back after signing in. Your code must send one of these exactly.">
        <RedirectChips value={uris} onChange={setUris} type={app.type} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!urisChanged || busy === 'uris'}
            onClick={() =>
              void run('uris', async () => {
                await post(app.id, { action: 'redirects', redirectUris: uris })
                setMsg({ where: 'uris', text: 'Saved. The change works straight away.', ok: true })
                router.refresh()
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-40"
          >
            {busy === 'uris' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Save addresses
          </button>
          {urisChanged && (
            <button type="button" onClick={() => setUris(app.redirectUris)} className="h-10 px-4 text-sm text-mute hover:text-paper">
              Undo changes
            </button>
          )}
        </div>
        <Msg where="uris" />
      </Card>

      <Card title="Test it" sub="Check that a sign-in with this app and a return address will work.">
        <SetupChecker issuer={SITE.url} initialClientId={app.id} initialRedirect={testRedirect} />
      </Card>

      <Card title="Details" sub="What people see when they sign in, and what you told us the app is for." action={!editing && <button type="button" onClick={() => setEditing(true)} className="h-9 rounded-pill border border-line-strong px-4 text-xs hover:bg-paper/10">Edit details</button>}>
        {editing ? (
          <AppForm
            mode="edit"
            appId={app.id}
            initial={draft}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false)
              setMsg({ where: 'details', text: 'Saved.', ok: true })
              router.refresh()
            }}
          />
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ['Kind', kindLabel(app.kind)],
              ['Website', app.website || '—'],
              ['For', app.useCases.map((u) => USE_CASES.find((x) => x.id === u)?.label ?? u).join(', ') || '—'],
              ['Privacy policy', app.privacyUrl || '—'],
              ['Terms', app.termsUrl || '—'],
              ['Registered', when(app.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-xs text-mute">{k}</dt>
                <dd className="mt-1 break-words">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-xs text-mute">How it uses logoless</dt>
              <dd className="mt-1 leading-relaxed whitespace-pre-line">{app.useDescription || '—'}</dd>
            </div>
          </dl>
        )}
        <Msg where="details" />
      </Card>

      <Card title="Delete this app" sub="Everyone who signed in with it is signed out of it, and it stops working at once. This cannot be undone." className="border-signal/30">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            void run('delete', async () => {
              await post(app.id, { action: 'delete', confirm })
              router.push('/dashboard/developer')
              router.refresh()
            })
          }}
        >
          <label className="grid flex-1 gap-1.5">
            <span className="text-sm">
              Type <b className="font-medium">{app.name}</b> to confirm
            </span>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper" />
          </label>
          <button type="submit" disabled={confirm.trim() !== app.name || busy === 'delete'} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-pill bg-signal/10 px-5 text-sm text-signal hover:bg-signal/20 disabled:opacity-40">
            {busy === 'delete' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />} Delete app
          </button>
        </form>
        <Msg where="delete" />
      </Card>
    </div>
  )
}
