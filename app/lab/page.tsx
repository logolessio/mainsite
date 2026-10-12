import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { StreetLab } from '@/components/lab/street-lab'
import { featureState } from '@/lib/features'

export const metadata: Metadata = { title: 'Lab: street | logoless', robots: { index: false, follow: false } }

/** An experiment that only exists on the dev site. On logoless.io this page does not exist. */
export default async function Page() {
  await connection()
  if (!(await featureState()).dev) notFound()
  return <StreetLab />
}
