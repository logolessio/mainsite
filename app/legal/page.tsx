import type { Metadata } from 'next'
import { LegalIndexView } from '@/components/legal/legal-view'

export const metadata: Metadata = { title: 'Legal | logoless', description: 'Terms, privacy and policies.' }

export default function Page() {
  return <LegalIndexView />
}
