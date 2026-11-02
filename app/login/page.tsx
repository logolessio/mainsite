import type { Metadata } from 'next'
import { BioAuth } from '@/components/auth/bio-auth'

export const metadata: Metadata = {
  title: 'Log in | logoless',
  description: 'Access your logoless account with Discord, Google or email.',
}

export default function Page() {
  return <BioAuth mode="login" />
}
