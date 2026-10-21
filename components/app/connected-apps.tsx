'use client'

import { BadgeCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { SCOPES } from '@/lib/oauth-scopes'
import { ActionButton, Card } from './ui'

type Item = { app: { id: string; name: string; website: string; verified: boolean }; grant: { scope: string[]; at: number; last: number } }

/** Sites and apps this person signed in to with logoless, and a way to disconnect each. Only shown when the developer section is on. */
export function ConnectedApps() {
  const on = useFeature('developers')
  const [items, setItems] = useState<Item[] | null>(null)
  const [busy, setBusy] = useState('')
  const load = useCallback(() => {
    fetch('/api/me/oauth', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { apps: Item[] } | null) => setItems(j?.apps ?? []))
      .catch(() => setItems([]))
  }, [])
  useEffect(() => {
    if (on) load()
  }, [on, load])
  if (!on || !items || items.length === 0) return null
  return (
    <Card id="apps" title="Connected apps" sub="Places you signed in to with logoless. Disconnecting ends their access at once.">
      <ul className="divide-y divide-line">
        {items.map(({ app, grant }) => (
          <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[15px]">
                {app.name} {app.verified && <BadgeCheck className="size-4" aria-label="Checked by logoless" />}
              </p>
              <p className="text-xs text-mute">
                Can see: {grant.scope.map((s) => SCOPES.find((x) => x.id === s)?.label.replace(/^See your |^Know /, '').toLowerCase() ?? s).join(', ')} · since {new Date(grant.at * 1000).toLocaleDateString('en-GB')}
              </p>
            </div>
            <ActionButton
              variant="ghost"
              disabled={busy === app.id}
              onClick={async () => {
                setBusy(app.id)
                await fetch('/api/me/oauth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: app.id }) }).catch(() => null)
                setBusy('')
                load()
              }}
            >
              Disconnect
            </ActionButton>
          </li>
        ))}
      </ul>
    </Card>
  )
}
