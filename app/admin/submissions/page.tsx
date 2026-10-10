import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { ReviewQueue } from '@/components/app/review-queue'

export const metadata: Metadata = { title: 'Review queue — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Review queue" sub="Approve or reject clips that automatic checks could not decide." />
      <ReviewQueue />
    </>
  )
}
