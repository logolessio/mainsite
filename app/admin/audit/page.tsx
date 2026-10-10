import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { AuditTable } from '@/components/app/admin-tables'

export const metadata: Metadata = { title: 'Audit log — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Audit log" sub="A record of admin actions." />
      <AuditTable />
    </>
  )
}
