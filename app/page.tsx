import type { Metadata } from 'next'
import { Home } from '@/components/home/home'

export const metadata: Metadata = { title: 'logoless | link in bio that moves', description: 'The link in bio for editors: a full-screen page with shaders, music, ten layouts and a cursor of your own. Claim logoless.io/you.' }

export default function Page() {
  return <Home />
}
