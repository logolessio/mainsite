'use client'

import { BadgeCheck, Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import type { SocialPlatform } from '@/lib/accounts'
import { usernameOf, type ProfileLink } from '@/lib/profile-style'
import type { State } from '@/lib/bio-verify'
import { AddAccountDialog } from './add-account-dialog'
import { BioVerifyDialog } from './bio-verify-dialog'
import { Badge } from './table'
import { ActionButton, Card, Toggle } from './ui'

const ACCOUNTS: { name: SocialPlatform; label: string; body: string }[] = [
  { name: 'tiktok', label: 'TikTok', body: 'The account you post content from.' },
  { name: 'youtube', label: 'YouTube', body: 'Your channel for Shorts and long-form.' },
  { name: 'instagram', label: 'Instagram', body: 'Where your Reels live.' },
]

/** The accounts you post from. They are kept on your profile, so there is one place to edit them. */
export function AccountsPanel() {
  const [links, setLinks] = useState<ProfileLink[] | null>(null)
  const [dialog, setDialog] = useState<SocialPlatform | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [shown, setShown] = useState(false) // whether strangers can see these on the public profile
  const [states, setStates] = useState<State[]>([])
  const [verifying, setVerifying] = useState<SocialPlatform | null>(null)

  const loadStates = () =>
    fetch('/api/me/accounts/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { accounts?: State[] } | null) => j?.accounts && setStates(j.accounts))
      .catch(() => {})

  useEffect(() => {
    fetch('/api/me/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { profile?: { links: ProfileLink[]; show?: { links?: boolean } }; error?: string }) => {
        if (!j.profile) return setError(j.error ?? 'Could not load.')
        setLinks(j.profile.links)
        setShown(Boolean(j.profile.show?.links))
      })
      .catch(() => setError('Could not load your accounts.'))
    void loadStates()
  }, [])

  const save = async (next: ProfileLink[]) => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links: next }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { profile?: { links: ProfileLink[] }; error?: string }
    setBusy(false)
    if (!res?.ok || !j.profile) return setError(j.error ?? 'Could not save that.')
    setLinks(j.profile.links)
    void loadStates()
  }

  const setVisible = async (next: boolean) => {
    setShown(next)
    const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ show: { links: next } }) }).catch(() => null)
    if (!res?.ok) {
      setShown(!next)
      setError('Could not save that.')
    }
  }

  if (!links) return <p className="text-mute">{error || 'Loading…'}</p>
  const has = (p: string) => links.find((l) => l.platform === p)

  return (
    <>
      <Card>
        <ul className="divide-y divide-line">
          {ACCOUNTS.map((a) => {
            const l = has(a.name)
            const st = states.find((x) => x.platform === a.name)
            const verified = st?.status === 'verified'
            return (
              <li key={a.name} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-pill border border-line"><BrandIcon name={a.name as BrandName} className="size-5" /></span>
                <span className="min-w-0 flex-1 basis-40">
                  <span className="block font-medium">{a.label}</span>
                  <span className="block truncate text-sm text-mute">{l ? `@${usernameOf(a.name, l.url).replace(/^https?:\/\/[^/]+\/@?/, '')}` : a.body}</span>
                  {l && st?.note && !verified && <span className="mt-1 block text-xs text-amber-200/90">{st.note}</span>}
                </span>
                {l && (verified ? <Badge tone="good"><BadgeCheck className="mr-1 size-3.5" />Verified</Badge> : st?.status === 'waiting' ? <Badge tone="warn">Waiting for the team</Badge> : <Badge><Check className="mr-1 size-3" />Linked</Badge>)}
                {l && !verified && st?.handle && (
                  <ActionButton onClick={() => setVerifying(a.name)}>{st.status === 'code' || st.status === 'waiting' ? 'Continue verifying' : 'Verify'}</ActionButton>
                )}
                {l ? (
                  <ActionButton variant="ghost" disabled={busy} onClick={() => save(links.filter((x) => x.platform !== a.name))}>
                    {busy && <Loader2 className="size-4 animate-spin" />} Remove
                  </ActionButton>
                ) : (
                  <ActionButton onClick={() => setDialog(a.name)}>Add</ActionButton>
                )}
              </li>
            )
          })}
        </ul>
        {error && <p role="alert" className="mt-4 text-sm text-signal">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-5">
          <div>
            <p className="text-[15px]">Show these on my public profile</p>
            <p className="text-sm text-mute">Off by default. Only the accounts above are ever shown.</p>
          </div>
          <Toggle label="Show creator accounts on my public profile" checked={shown} onChange={setVisible} />
        </div>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
          These are the accounts you post from. Verify one by putting a short code in its bio: verified accounts get a tick on your public page, and submissions from them can be checked automatically instead of waiting for a person. Only submit content you posted yourself. You choose above whether the public can see them.</p>
      </Card>
      <BioVerifyDialog
        platform={verifying}
        handle={states.find((x) => x.platform === verifying)?.handle ?? ''}
        open={verifying !== null}
        onClose={() => setVerifying(null)}
        onChange={() => void loadStates()}
      />
      <AddAccountDialog
        platform={dialog}
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onAdded={(p, _h, url) => {
          setDialog(null)
          void save([...links.filter((l) => l.platform !== p), { platform: p, url }])
        }}
      />
    </>
  )
}
