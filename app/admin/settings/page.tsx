import type { Metadata } from 'next'
import { AdminSettings } from '@/components/app/admin-settings'
import { PageHeader } from '@/components/app/ui'

export const metadata: Metadata = { title: 'Platform settings — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Platform settings" sub="Fees, limits and verification rules." />
      <AdminSettings />
    </>
  )
}
