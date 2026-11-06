import type { Metadata } from 'next'
import { Home } from '@/components/home/home'

export const metadata: Metadata = { title: 'logoless | link in bio that moves', description: 'logoless is a link in bio for editors: one page for your links, socials and edits, with a floating 3D card, effects like embers and smoke, music and a cursor of your own. Free.' }

export default function Page() {
  return <Home />
}
