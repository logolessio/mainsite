import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { UsersTable } from '@/components/app/admin-tables'

export const metadata: Metadata = { title: 'Users — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Users" sub="Search, verify and suspend accounts." />
      <UsersTable />
    </>
  )
}
