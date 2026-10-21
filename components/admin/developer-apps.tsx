'use client'

import { BadgeCheck } from 'lucide-react'
import { AdminButton } from './ui'

type A = { id: string; name: string; website: string; type: string; verified: boolean; suspended: boolean; createdAt: number; redirectUris: string[]; ownerEmail: string | null }

export function DeveloperApps({ apps }: { apps: A[] }) {
  if (apps.length === 0) return <p className="py-12 text-center text-sm text-mute">No apps yet.</p>
  return (
    <ul className="grid max-w-4xl gap-3">
      {apps.map((a) => (
        <li key={a.id} className="grid gap-3 rounded-[calc(1.6rem*var(--round,1))] border border-line bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg">{a.name}</p>
            {a.verified && (
              <span className="inline-flex items-center gap-1 rounded-pill border border-line-strong px-2.5 py-0.5 text-[11px]">
                <BadgeCheck className="size-3.5" /> Checked
              </span>
            )}
            {a.suspended && <span className="rounded-pill border border-signal/50 px-2.5 py-0.5 text-[11px] text-signal">Switched off</span>}
            <span className="text-xs text-mute">{a.type === 'confidential' ? 'Server app' : 'Browser or phone app'}</span>
          </div>
          <p className="text-xs text-mute">
            {a.ownerEmail ?? 'unknown owner'} · {a.website || 'no website'} · <span className="font-mono">{a.id}</span>
          </p>
          <ul className="text-xs text-mute">
            {a.redirectUris.map((u) => (
              <li key={u} className="truncate font-mono">
                {u}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {a.verified ? <AdminButton url={`/api/admin/oauth/${a.id}`} data={{ action: 'unverify' }}>Remove check</AdminButton> : <AdminButton variant="solid" url={`/api/admin/oauth/${a.id}`} data={{ action: 'verify' }}>Mark as checked</AdminButton>}
            {a.suspended ? <AdminButton url={`/api/admin/oauth/${a.id}`} data={{ action: 'restore' }}>Switch back on</AdminButton> : <AdminButton variant="danger" url={`/api/admin/oauth/${a.id}`} data={{ action: 'suspend' }} confirm={`Switch ${a.name} off?`} summary={['People can no longer sign in to it with logoless.', 'You can switch it back on at any time.']}>Switch off</AdminButton>}
            <AdminButton variant="danger" url={`/api/admin/oauth/${a.id}`} data={{ action: 'delete' }} confirm={`Delete ${a.name} for good?`} summary={['Everyone signed in through it is signed out, and its keys stop working.']} typed="DELETE">Delete</AdminButton>
          </div>
        </li>
      ))}
    </ul>
  )
}
