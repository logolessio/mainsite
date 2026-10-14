'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Toggle } from '@/components/app/ui'
import { ROLES, type Role } from '@/lib/roles'
import { askAdminSecret } from './secret-dialog'

/** The roles someone holds. Changing them asks for the admin password, then tells the person by notification, email and Discord. */
export function RoleEditor({ userId, initial, owner, canEdit }: { userId: string; initial: Role[]; owner: boolean; canEdit: boolean }) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initial)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const change = async (role: Role, on: boolean) => {
    const next = on ? [...new Set([...roles, role])] : roles.filter((r) => r !== role)
    const label = ROLES.find((r) => r.id === role)?.label ?? role
    const secret = await askAdminSecret(`${on ? 'Giving' : 'Removing'} the ${label} role ${on ? 'to' : 'from'} this person.`)
    if (!secret) return
    setBusy(true)
    setError('')
    setNote('')
    try {
      const res = await fetch(`/api/admin/people/${userId}/roles`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ roles: next, secret }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string; roles?: Role[]; emailed?: boolean; discord?: boolean }
      if (!res.ok) throw new Error(j.error ?? 'Could not change the role.')
      setRoles(j.roles ?? next)
      setNote(`Saved. They were notified${j.emailed ? ', emailed' : ''}${j.discord ? ' and messaged on Discord' : ''}.`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the role.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {ROLES.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm">{r.label}</p>
              <p className="text-xs text-mute">{r.hint}</p>
            </div>
            <div className={busy || !canEdit || owner ? 'pointer-events-none opacity-50' : ''}>
              <Toggle label={r.label} checked={owner || roles.includes(r.id)} onChange={(v) => change(r.id, v)} />
            </div>
          </li>
        ))}
      </ul>
      {owner && <p className="mt-3 text-xs text-mute">This is the owner. The owner always has every role.</p>}
      {!owner && !canEdit && <p className="mt-3 text-xs text-mute">Only the owner can change roles.</p>}
      {note && <p className="mt-3 text-xs text-emerald-300">{note}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-signal">{error}</p>}
    </div>
  )
}
