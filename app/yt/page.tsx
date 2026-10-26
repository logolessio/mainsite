import type { Metadata, Viewport } from 'next'
import { SideEffectsPlan } from '@/components/yt/side-effects-plan'

export const metadata: Metadata = {
  title: 'Side Effects. | the channel plan',
  description: 'Everything for the Side Effects faceless animated YouTube channel: next steps, the money, the scripts and voiceovers, the idea bank, the brand and the workflow.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#0c0c10' }

/** yt.logoless.io (see middleware.ts): one page, the whole plan for the channel. The videos come from faceless-channel/ via `channel.py site`. */
export default function YtPage() {
  return <SideEffectsPlan />
}
