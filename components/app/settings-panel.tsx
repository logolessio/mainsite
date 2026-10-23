'use client'

import { Bell, KeyRound, Mail, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { calmWasAutomatic, clearCalmChoice, getCalmChoice, getContrast, getLargeText, getUnderline, setCalm, setContrast, setLargeText, setUnderline, subscribeCalm } from '@/lib/calm'
import { InstallCard } from '@/components/extras/install-card'
import { PasskeysCard } from '@/components/extras/passkeys-card'
import { TwoStepCard } from '@/components/extras/two-step-card'
import { DeleteCard } from './account-cards'
import { ConnectedApps } from './connected-apps'
import { ContactCard } from './contact-card'
import { DiscordCard } from './discord-card'
import { SidebarCard } from './sidebar-card'
import { JumpBar } from './jump-bar'
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
    <div className="max-w-3xl">
      <JumpBar
        items={[
          { id: 'account', label: 'Account' },
          { id: 'contact', label: 'Contact' },
          { id: 'discord', label: 'Discord' },
          { id: 'apps', label: 'Apps' },
          { id: 'display', label: 'Display' },
          { id: 'password', label: 'Password' },
          { id: 'delete', label: 'Delete' },
        ]}
      />
      <div className="grid gap-6">
      <Card id="account" title="Account">
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

      <ContactCard />

      <DiscordCard />

      {role === 'clipper' && <SidebarCard />}

      <InstallCard />

      <ConnectedApps />

      <Display />


      <PasswordCard me={me} />

      <PasskeysCard />

      <TwoStepCard />

      <DeleteCard />
      </div>
    </div>
  )
}

function Row({ icon, title, body, href, cta }: { icon: React.ReactNode; title: string; body: string; href?: string; cta?: string }) {
  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-pill border border-line text-mute">{icon}</span>
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
      <Card id="password" title="Password">
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
    <Card id="password" title="Password">
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

/** How the site moves and reads: calm mode, text size, contrast and links. */
function Display() {
  const choice = useSyncExternalStore(subscribeCalm, getCalmChoice, () => 'auto' as const)
  const large = useSyncExternalStore(subscribeCalm, getLargeText, () => false)
  const auto = useSyncExternalStore(subscribeCalm, calmWasAutomatic, () => false)
  const contrast = useSyncExternalStore(subscribeCalm, getContrast, () => false)
  const underline = useSyncExternalStore(subscribeCalm, getUnderline, () => false)
  return (
    <Card id="display" title="Display">
      <div className="grid gap-8">
        <div>
          <p className="text-[15px]">Calm mode</p>
          <p className="mt-1 text-sm text-mute">Turns off the moving background and heavy animation. Automatic switches it on only when your device struggles.{auto && choice === 'on' ? ' It was switched on for you.' : ''}</p>
          <div className="mt-4">
            <GlassTabs
              label="Calm mode"
              value={choice}
              onChange={(v) => (v === 'auto' ? clearCalmChoice() : setCalm(v === 'on'))}
              tabs={[{ id: 'auto', label: 'Automatic' }, { id: 'on', label: 'On' }, { id: 'off', label: 'Off' }]}
              className="mx-0"
            />
          </div>
        </div>
        <div>
          <p className="text-[15px]">Text size</p>
          <p className="mt-1 text-sm text-mute">Makes everything on the site a little bigger.</p>
          <div className="mt-4">
            <GlassTabs label="Text size" value={large ? 'large' : 'standard'} onChange={(v) => setLargeText(v === 'large')} tabs={[{ id: 'standard', label: 'Standard' }, { id: 'large', label: 'Large' }]} className="mx-0" />
          </div>
        </div>
        <div>
          <p className="text-[15px]">Contrast</p>
          <p className="mt-1 text-sm text-mute">Brighter text and stronger outlines, so everything is easier to see. Your device&apos;s own high contrast setting turns this on by itself.</p>
          <div className="mt-4">
            <GlassTabs label="Contrast" value={contrast ? 'high' : 'standard'} onChange={(v) => setContrast(v === 'high')} tabs={[{ id: 'standard', label: 'Standard' }, { id: 'high', label: 'High' }]} className="mx-0" />
          </div>
        </div>
        <div>
          <p className="text-[15px]">Links</p>
          <p className="mt-1 text-sm text-mute">Underline every link in the text, so links never depend on colour alone.</p>
          <div className="mt-4">
            <GlassTabs label="Links" value={underline ? 'underline' : 'standard'} onChange={(v) => setUnderline(v === 'underline')} tabs={[{ id: 'standard', label: 'Standard' }, { id: 'underline', label: 'Underlined' }]} className="mx-0" />
          </div>
        </div>
        <div>
          <p className="text-[15px]">Keyboard</p>
          <p className="mt-1 text-sm text-mute">Press <kbd className="rounded border border-line-strong px-1.5 font-mono text-xs">?</kbd> on any page to see the shortcuts that work there. Letters stay quiet while you type.</p>
          <div className="mt-4">
            <ActionButton variant="ghost" onClick={() => window.dispatchEvent(new Event('logoless:help'))}>
              Show the shortcut list
            </ActionButton>
          </div>
        </div>
      </div>
    </Card>
  )
}
