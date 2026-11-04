import type { Metadata } from 'next'
import { Home } from '@/components/home/home'

export const metadata: Metadata = { title: 'logoless | link in bio that moves', description: 'logoless is a link in bio for editors: one page for your links, socials, edits and music, with ten layouts, live backgrounds and a cursor of your own. Claim logoless.io/you.' }

export default function Page() {
  return <Home />
}
