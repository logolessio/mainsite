'use client'

import { useState } from 'react'
import { Field, Input, Select } from '@/components/ui/fields'
import { ActionButton, Card, Toggle } from './ui'

export function SettingsPanel({ role }: { role: 'clipper' | 'brand' }) {
  const [prefs, setPrefs] = useState({ campaigns: true, payouts: true, product: false })
  const [saved, setSaved] = useState(false)
  const toggle = (k: keyof typeof prefs) => (v: boolean) => setPrefs((p) => ({ ...p, [k]: v }))

  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="Profile">
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            // TODO(backend): PATCH /api/me
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name">
              <Input name="name" autoComplete="name" />
            </Field>
            <Field label={role === 'brand' ? 'Brand / company' : 'Handle'}>
              <Input name="handle" />
            </Field>
          </div>
          <Field label="Email" hint="Changing your email requires confirmation.">
            <Input type="email" name="email" autoComplete="email" />
          </Field>
          <Field label="Country">
            <Select name="country" defaultValue="">
              <option value="" disabled>
                Select a country
              </option>
              {['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Singapore', 'Other'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center gap-3">
            <ActionButton type="submit">Save changes</ActionButton>
            {saved && <span role="status" className="text-sm text-mute">Saved</span>}
          </div>
        </form>
      </Card>

      <Card title="Notifications">
        <ul className="divide-y divide-line">
          {(
            [
              ['campaigns', 'New campaigns', 'Drops that match what you clip.'],
              ['payouts', 'Payments and payouts', 'Verified earnings, withdrawals and failures.'],
              ['product', 'Product updates', 'Occasional news about logoless.'],
            ] as const
          ).map(([k, t, d]) => (
            <li key={k} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <span>
                <span className="block">{t}</span>
                <span className="block text-sm text-mute">{d}</span>
              </span>
              <Toggle label={t} checked={prefs[k]} onChange={toggle(k)} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Security">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            <Input type="password" autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <Input type="password" autoComplete="new-password" />
          </Field>
        </div>
        <ActionButton variant="ghost" className="mt-4">Update password</ActionButton>
      </Card>

      <Card title="Danger zone">
        <p className="text-sm text-mute">
          Deleting your account removes your profile and linked accounts. Balances owed are paid out first. This cannot be undone.
        </p>
        <ActionButton variant="danger" className="mt-4">Delete account</ActionButton>
      </Card>
    </div>
  )
}
