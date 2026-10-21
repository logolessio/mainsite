'use client'

import { BadgeCheck, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BioVerifyDialog, type Connect } from '@/components/app/bio-verify-dialog'
import { BrandIcon } from '@/components/brand-icon'
import type { State } from '@/lib/bio-verify'
import { cn } from '@/lib/utils'

type P = State['platform']
const ROWS: { key: P; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
]

/**
 * Adding an account and proving it is one thing here: press Connect, give the username, put the code in the bio, press check, and
 * the account is on the profile with its tick. `onLinked` lets the flow keep the username it will save with the profile.
 */
export function ConnectAccounts({ linked, onLinked }: { linked: Record<string, string>; onLinked: (platform: P, handle: string) => void }) {
  const [states, setStates] = useState<State[]>([])
  const [open, setOpen] = useState<P | null>(null)
  const [mode, setMode] = useState<'connect' | 'verify'>('connect')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/me/accounts/verify', { cache: 'no-store' }).catch(() => null)
    const j = (await res?.json().catch(() => null)) as { accounts?: State[] } | null
    if (j?.accounts) setStates(j.accounts)
    setLoaded(true)
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const connect: Connect = {
    save: async (p, url) => {
      // the account goes on the profile now, so the code can be made for it
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ links: [{ platform: p, url }] }) }).catch(() => null)
      const j = (await res?.json().catch(() => ({}))) as { error?: string }
      if (!res?.ok) return j.error ?? 'Could not save that. Please try again.'
      const handle = /([^/@?]+)\/?(?:\?.*)?$/.exec(url)?.[1] ?? ''
      onLinked(p, handle)
      void load()
      return null
    },
  }

  return (
    <>
      <div className="grid w-full max-w-sm gap-3">
        {ROWS.map(({ key, label }) => {
          const st = states.find((x) => x.platform === key)
          const verified = st?.status === 'verified'
          const waiting = st?.status === 'waiting'
          const handle = st?.handle || linked[key]?.replace(/^@/, '') || ''
          const added = Boolean(handle)
          return (
            <div key={key} className="flex h-14 items-center gap-3 rounded-pill border border-line-strong pr-2 pl-5">
              <BrandIcon name={key} className="size-5 shrink-0 text-mute" />
              <span className="min-w-0 flex-1 truncate text-left text-[16px]">{added ? `@${handle}` : <span className="text-mute/70">{label}</span>}</span>
              {verified ? (
                <span className="mr-3 inline-flex items-center gap-1.5 text-sm text-mute">
                  <BadgeCheck aria-hidden="true" className="size-4" /> Verified
                </span>
              ) : waiting ? (
                <span className="mr-3 text-sm text-mute">With the team</span>
              ) : (
                <button
                  type="button"
                  disabled={!loaded}
                  onClick={() => {
                    setMode(added ? 'verify' : 'connect')
                    setOpen(key)
                  }}
                  className={cn('inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-sm font-medium transition-colors disabled:opacity-50', added ? 'bg-paper text-ink hover:bg-paper/85' : 'border border-line-strong hover:bg-white/[0.06]')}
                >
                  {!loaded && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />} {added ? 'Verify' : 'Connect'}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <BioVerifyDialog
        platform={open}
        handle={open ? (states.find((x) => x.platform === open)?.handle ?? linked[open]?.replace(/^@/, '') ?? '') : ''}
        open={open !== null}
        onClose={() => setOpen(null)}
        onChange={() => void load()}
        connect={mode === 'connect' ? connect : undefined}
      />
    </>
  )
}
