'use client'

import { BadgeCheck, Loader2, TriangleAlert } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import { Avatar } from '@/components/shell/nav-user'
import { SCOPES } from '@/lib/oauth-scopes'

export type ConsentProps = {
  app: { name: string; description: string; website: string; verified: boolean }
  person: { name: string; handle: string; avatar: string | null }
  scope: string[]
  already: string[]
  params: Record<string, string>
  retry: string
}

/** "X wants to sign you in." Allow or cancel. Nothing is shared until Allow is pressed. */
export function ConsentForm({ app, person, scope, already, params, retry }: ConsentProps) {
  const [busy, setBusy] = useState<'allow' | 'deny' | ''>('')
  const [error, setError] = useState('')
  const host = (() => {
    try {
      return new URL(app.website).hostname
    } catch {
      return ''
    }
  })()

  const decide = async (decision: 'allow' | 'deny') => {
    setBusy(decision)
    setError('')
    try {
      const res = await fetch('/api/oauth/consent', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...params, decision }) })
      const j = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string }
      if (!res.ok || !j.redirect) throw new Error(j.error ?? 'Something went wrong. Please try again.')
      window.location.assign(j.redirect)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy('')
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-[#0b0b0d] p-7 md:p-9">
      <p className="text-center text-sm text-mute">Sign in with logoless</p>
      <h1 className="mt-3 text-center font-display text-3xl leading-tight tracking-[-0.03em]">
        {app.name} <span className="text-mute">wants to know it is you</span>
      </h1>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-mute">
        {app.verified ? (
          <>
            <BadgeCheck className="size-4 text-paper" aria-hidden="true" /> Checked by logoless{host ? ` · ${host}` : ''}
          </>
        ) : (
          <>
            <TriangleAlert className="size-4 text-amber-300" aria-hidden="true" /> Made by an independent developer{host ? ` · ${host}` : ''}. logoless has not checked it.
          </>
        )}
      </p>
      {app.description && <p className="mt-3 text-center text-sm text-paper/70">{app.description}</p>}

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
        <Avatar src={person.avatar} name={person.name} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px]">{person.name}</p>
          <p className="truncate text-xs text-mute">@{person.handle}</p>
        </div>
        <button type="button" onClick={() => signOut({ callbackUrl: retry })} className="shrink-0 text-xs text-mute underline underline-offset-4 hover:text-paper">
          Not you?
        </button>
      </div>

      <p className="mt-6 text-sm text-mute">{app.name} will be able to:</p>
      <ul className="mt-3 grid gap-3">
        {scope.map((id) => {
          const s = SCOPES.find((x) => x.id === id)
          if (!s) return null
          return (
            <li key={id} className="rounded-2xl border border-line px-4 py-3">
              <p className="text-[15px]">
                {s.label}
                {already.includes(id) && <span className="ml-2 text-xs text-mute">already allowed</span>}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-mute">{s.gives}</p>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-mute">It will never see your password, your earnings or your PayPal. You can disconnect it any time in Settings.</p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-signal">
          {error}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" disabled={Boolean(busy)} onClick={() => decide('deny')} className="inline-flex h-12 items-center justify-center rounded-pill border border-line-strong text-[15px] transition-colors hover:bg-paper/10 disabled:opacity-40">
          Cancel
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={() => decide('allow')} className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-paper text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
          {busy === 'allow' && <Loader2 className="size-4 animate-spin" />} Allow
        </button>
      </div>
    </div>
  )
}
