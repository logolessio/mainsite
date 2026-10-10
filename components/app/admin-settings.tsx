'use client'

import { useState } from 'react'
import { Field, Input, Select } from '@/components/ui/fields'
import { SITE } from '@/lib/site'
import { ActionButton, Card, Toggle } from './ui'

export function AdminSettings() {
  const [maintenance, setMaintenance] = useState(false)
  const [signups, setSignups] = useState(true)
  const [autoApprove, setAutoApprove] = useState(true)
  return (
    <div className="grid max-w-3xl gap-6">
      <Card title="Money">
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()}>
          <Field label="Platform fee (%)">
            <Input inputMode="decimal" defaultValue={SITE.platformFeePct} />
          </Field>
          <Field label="Minimum payout ($)">
            <Input inputMode="numeric" defaultValue={SITE.minPayoutUsd} />
          </Field>
          <Field label="Minimum top-up ($)">
            <Input inputMode="numeric" defaultValue={SITE.minTopUpUsd} />
          </Field>
          <Field label="Verification window" hint="Days before earnings become available." className="sm:col-span-2">
            <Select defaultValue="3">
              {['1', '3', '7', '14'].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <ActionButton type="submit">Save</ActionButton>
          </div>
        </form>
      </Card>
      <Card title="Platform">
        <ul className="divide-y divide-line">
          {[
            ['Allow new sign-ups', signups, setSignups],
            ['Auto-approve clips that pass all checks', autoApprove, setAutoApprove],
            ['Maintenance mode', maintenance, setMaintenance],
          ].map(([label, v, set]) => (
            <li key={label as string} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <span>{label as string}</span>
              <Toggle label={label as string} checked={v as boolean} onChange={set as (v: boolean) => void} />
            </li>
          ))}
        </ul>
      </Card>
      {/* TODO(backend): persist and audit-log every change on this page. */}
    </div>
  )
}
