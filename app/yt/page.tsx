import type { Metadata, Viewport } from 'next'
import { SideEffectsPlan } from '@/components/yt/side-effects-plan'
import { YtLock } from '@/components/yt/yt-lock'
import { ytUnlocked } from '@/lib/yt/gate'
import { PLAN } from '@/lib/yt/plan'
import { lockYt } from './actions'

export const metadata: Metadata = {
  title: 'Side Effects. | the channel plan',
  description: 'The private plan for the Side Effects channel.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#0c0c10' }

/**
 * yt.logoless.io (see middleware.ts): one page, the whole plan for the channel, behind a password (lib/yt/gate.ts).
 * The plan is only sent once the password is in. The videos come from faceless-channel/ via `channel.py site`.
 */
export default async function YtPage() {
  if (!(await ytUnlocked())) return <YtLock />
  return <SideEffectsPlan plan={PLAN} lock={lockYt} />
}
