'use client'

import { Check, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import type { SocialPlatform } from '@/lib/accounts'
import { usernameOf, type ProfileLink } from '@/lib/profile-style'
import { AddAccountDialog } from './add-account-dialog'
import { Badge } from './table'
import { ActionButton, Card } from './ui'

const ACCOUNTS: { name: SocialPlatform; label: string; body: string }[] = [
  { name: 'tiktok', label: 'TikTok', body: 'The account you post clips from.' },
  { name: 'youtube', label: 'YouTube', body: 'Your channel for Shorts and long-form.' },
  { name: 'instagram', label: 'Instagram', body: 'Where your Reels live.' },
]

/** The accounts you post from. They are kept on your profile, so there is one place to edit them. */
export function AccountsPanel() {
  const [links, setLinks] = useState<ProfileLink[] | null>(null)
  const [dialog, setDialog] = useState<SocialPlatform | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/me/profile', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { profile?: { links: ProfileLink[] }; error?: string }) => (j.profile ? setLinks(j.profile.links) : setError(j.error ?? 'Could not load.')))
      .catch(() => setError('Could not load your accounts.'))
  }, [])

  const save = async (next: ProfileLink[]) => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links: next }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { profile?: { links: ProfileLink[] }; error?: string }
    setBusy(false)
    if (!res?.ok || !j.profile) return setError(j.error ?? 'Could not save that.')
    setLinks(j.profile.links)
  }

  if (!links) return <p className="text-mute">{error || 'Loading…'}</p>
  const has = (p: string) => links.find((l) => l.platform === p)

  return (
    <>
      <Card>
        <ul className="divide-y divide-line">
          {ACCOUNTS.map((a) => {
            const l = has(a.name)
            return (
              <li key={a.name} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line"><BrandIcon name={a.name as BrandName} className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{a.label}</span>
                  <span className="block truncate text-sm text-mute">{l ? `@${usernameOf(a.name, l.url).replace(/^https?:\/\/[^/]+\/@?/, '')}` : a.body}</span>
                </span>
                {l && <Badge tone="good"><Check className="mr-1 size-3" />On your profile</Badge>}
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
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
          These are the accounts you post from. They show on your profile, and our team checks every submitted clip against them, so only submit clips you posted yourself. Anything else (Spotify, Twitch, your website) lives under Links on your profile.
        </p>
      </Card>
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
