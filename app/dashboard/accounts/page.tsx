import type { Metadata } from 'next'
import { AccountsPanel } from '@/components/app/accounts-panel'
import { DiscordCard } from '@/components/app/discord-card'
import { PageHeader } from '@/components/app/ui'

export const metadata: Metadata = { title: 'Accounts | logoless', robots: { index: false } }

/** Everything you connect: Discord, and the TikTok, Instagram and YouTube accounts you post from (each proved with a code in its bio). */
export default function Page() {
  return (
    <>
      <PageHeader title="Accounts" sub="Link Discord, and the TikTok, Instagram and YouTube accounts you post from. We prove each one is yours with a short code in its bio. We read public view counts and never post for you." />
      <div className="grid max-w-3xl gap-6">
        <DiscordCard />
        <AccountsPanel />
      </div>
    </>
  )
}
