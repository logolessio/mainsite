'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'
import { Input, Select } from '@/components/ui/fields'
import { type Column, DataTable, EmptyState } from './table'

/** Searchable, filterable list for admin tables. Pass real rows from your API. */
export function AdminList<T extends { id: string }>({
  rows,
  columns,
  searchKeys,
  filterLabel,
  filterOptions,
  filterKey,
  emptyTitle,
  emptyBody,
}: {
  rows: T[]
  columns: Column<T>[]
  searchKeys: (keyof T)[]
  filterLabel?: string
  filterOptions?: string[]
  filterKey?: keyof T
  emptyTitle: string
  emptyBody?: string
}) {
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const visible = rows.filter(
    (r) =>
      (f === 'all' || !filterKey || String(r[filterKey]) === f) &&
      (!q || searchKeys.some((k) => String(r[k]).toLowerCase().includes(q.toLowerCase()))),
  )
  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">Search</span>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mute" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-11" />
        </label>
        {filterOptions && (
          <label className="block sm:w-56">
            <span className="sr-only">{filterLabel}</span>
            <Select value={f} onChange={(e) => setF(e.target.value)}>
              <option value="all">All {filterLabel?.toLowerCase()}</option>
              {filterOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>
      <DataTable rows={visible} columns={columns} empty={<EmptyState title={emptyTitle} body={emptyBody} />} />
    </div>
  )
}
