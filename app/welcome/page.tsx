import type { Metadata } from 'next'
import { Welcome } from '@/components/marketing/home'

export const metadata: Metadata = {
  title: 'Our story | logoless',
  description: 'Why logoless exists: brands fund briefs, clippers cut them, real views get paid.',
}

export default function Page() {
  return <Welcome />
}
