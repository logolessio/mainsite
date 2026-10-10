'use client'

import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import type { SocialPlatform } from '@/lib/accounts'
import { Badge } from './table'
import { ActionButton, Card } from './ui'
import { VerifyAccountDialog } from './verify-account-dialog'

const ACCOUNTS: { name: BrandName; label: string; body: string; verify: boolean }[] = [
  { name: 'tiktok', label: 'TikTok', body: 'Verify with a code in your bio.', verify: true },
  { name: 'youtube', label: 'YouTube', body: 'Verify with a code in your channel description.', verify: true },
  { name: 'instagram', label: 'Instagram', body: 'Verify with a code in your bio.', verify: true },
  { name: 'discord', label: 'Discord', body: 'Campaign drops and payout alerts.', verify: false },
]

export function AccountsPanel() {
  // TODO(backend): load linked accounts. Discord connects through OAuth; the three video platforms use code-in-bio verification.
  const [linked, setLinked] = useState<Record<string, string>>({})
  const [dialog, setDialog] = useState<SocialPlatform | null>(null)

  const unlink = (name: string) => setLinked((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== name)))

  return (
    <>
      <Card>
        <ul className="divide-y divide-line">
          {ACCOUNTS.map((a) => {
            const handle = linked[a.name]
            return (
              <li key={a.name} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line">
                  <BrandIcon name={a.name} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{a.label}</span>
                  <span className="block text-sm text-mute">{handle ? `@${handle}` : a.body}</span>
                </span>
                {handle && (
                  <Badge tone="good">
                    <ShieldCheck className="mr-1 size-3" />
                    Verified
                  </Badge>
                )}
                <ActionButton
                  variant={handle ? 'ghost' : 'solid'}
                  onClick={() => {
                    if (handle) unlink(a.name)
                    else if (a.verify) setDialog(a.name as SocialPlatform)
                    else setLinked((s) => ({ ...s, [a.name]: 'discord-user' })) // TODO(backend): start Discord OAuth
                  }}
                >
                  {handle ? 'Unlink' : a.verify ? 'Verify' : 'Connect'}
                </ActionButton>
              </li>
            )
          })}
        </ul>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-mute">
          Only accounts verified here can be used to submit clips. Verification proves you control the account, so nobody can claim someone
          else&apos;s views.
        </p>
      </Card>

      <VerifyAccountDialog
        platform={dialog}
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onVerified={(p, h) => setLinked((s) => ({ ...s, [p]: h }))}
      />
    </>
  )
}
