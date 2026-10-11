'use client'

import { Bell, KeyRound, Mail, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { SITE } from '@/lib/site'
import { ActionButton, Card } from './ui'

type Me = { email: string; hasPassword: boolean }

export function SettingsPanel({ role }: { role: 'clipper' | 'brand' }) {
  const [me, setMe] = useState<Me | null>(null)
  useEffect(() => {
    fetch('/api/me/password', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Me | null) => setMe(j))
      .catch(() => setMe(null))
  }, [])

  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="Account">
        <ul className="divide-y divide-line">
          <Row icon={<Mail className="size-4" />} title="Email" body={me?.email ?? 'Loading…'} />
          {role === 'clipper' && (
            <>
              <Row icon={<UserRound className="size-4" />} title="Profile" body="Name, handle, photo, banner, bio and links." href="/dashboard/profile" cta="Edit profile" />
              <Row icon={<Bell className="size-4" />} title="Notifications" body="See everything we have told you about." href="/dashboard/notifications" cta="Open" />
            </>
          )}
        </ul>
      </Card>

      <PasswordCard me={me} />

      <Card title="Delete your account">
        <p className="text-sm leading-relaxed text-mute">
          Deleting your account removes your profile and linked accounts. Any balance owed to you is paid out first, and records we are required to keep (like payment history) are kept. This cannot be undone.
        </p>
        <a
          href={`mailto:${SITE.emails.privacy}?subject=${encodeURIComponent('Delete my logoless account')}${me ? `&body=${encodeURIComponent(`Please delete the logoless account for ${me.email}.`)}` : ''}`}
          className="mt-4 inline-flex"
        >
          <ActionButton variant="danger" type="button">
            Ask us to delete my account
          </ActionButton>
        </a>
        <p className="mt-3 text-xs text-mute">We confirm it is you, settle anything owed, then delete it within 30 days.</p>
      </Card>
    </div>
  )
}

function Row({ icon, title, body, href, cta }: { icon: React.ReactNode; title: string; body: string; href?: string; cta?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-mute">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block truncate text-sm text-mute">{body}</span>
      </span>
      {href && (
        <Link href={href} className="text-sm underline underline-offset-4 hover:text-paper">
          {cta}
        </Link>
      )}
    </li>
  )
}

function PasswordCard({ me }: { me: Me | null }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (me && !me.hasPassword)
    return (
      <Card title="Password">
        <p className="flex items-start gap-3 text-sm leading-relaxed text-mute">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <span>
            You sign in with Google or Discord, so there is no password to change. Want one as well?{' '}
            <Link href="/forgot-password" className="text-paper underline underline-offset-4">
              Add a password
            </Link>
            .
          </span>
        </p>
      </Card>
    )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/me/password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ current, next }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (res?.ok) {
      setCurrent('')
      setNext('')
      setMsg({ ok: true, text: 'Password updated.' })
    } else setMsg({ ok: false, text: j?.error ?? 'Could not update your password.' })
  }

  return (
    <Card title="Password">
      <form onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label="New password" hint="At least 10 characters.">
            <Input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionButton type="submit" variant="ghost" disabled={busy || !current || !next}>
            {busy ? 'Updating…' : 'Update password'}
          </ActionButton>
          {msg && (
            <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-mute' : 'text-sm text-signal'}>
              {msg.text}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-mute">
          Forgot it?{' '}
          <Link href="/forgot-password" className="underline underline-offset-4">
            Reset it by email
          </Link>
          .
        </p>
      </form>
    </Card>
  )
}
