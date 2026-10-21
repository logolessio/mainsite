import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { discordStepState } from '@/lib/discord/welcome'
import { getSession } from '@/lib/session'
import { requireUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Link Discord | logoless', robots: { index: false } }

const primary = 'inline-flex h-14 items-center justify-center rounded-pill bg-paper px-10 text-[17px] font-medium text-ink transition-colors hover:bg-paper/85'
const quiet = 'text-[15px] text-mute underline underline-offset-4 transition-colors hover:text-paper'

const PROBLEM: Record<string, string> = {
  cancelled: 'Discord was not linked. Press the button to try again.',
  taken: 'That Discord account is already linked to another logoless account.',
  setup: 'Linking Discord is not switched on yet. Please try again later.',
  error: 'Something went wrong with Discord. Please try again.',
}

/**
 * The last step of onboarding for people who came from the Get started button in Discord: link Discord, then go back to the server,
 * where a message only they can see says what to do next (see lib/discord/welcome.ts).
 */
export default async function DiscordStep({ searchParams }: { searchParams: Promise<{ discord?: string }> }) {
  if (!(await getSession())?.user?.email) redirect('/onboarding?ref=discord')
  const user = await requireUser()
  const s = await discordStepState(user.id)
  const problem = PROBLEM[(await searchParams).discord ?? '']
  return (
    <main className="mx-auto flex min-h-[80svh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[13px] tracking-[0.2em] text-mute uppercase">{s.linked ? 'All done' : 'Last step'}</p>
      <h1 className="mt-4 font-display text-4xl tracking-[-0.03em] md:text-5xl">{s.linked ? 'You are in.' : 'Link your Discord'}</h1>
      <p className="mt-4 text-[17px] text-mute">
        {s.linked
          ? 'Head back to Discord: in #get-started there is a message only you can see with what to do next, and the full rundown is in your direct messages.'
          : 'One approval on Discord’s own page. It gives you your roles, your numbers in the server and your notifications there.'}
      </p>
      {problem && !s.linked && (
        <p role="alert" className="mt-6 text-[15px] text-signal">
          {problem}
        </p>
      )}
      <div className="mt-10 flex flex-col items-center gap-5">
        {s.linked ? (
          s.channelUrl ? (
            <a href={s.channelUrl} className={primary}>
              Back to Discord
            </a>
          ) : (
            <Link href="/dashboard" className={primary}>
              Open dashboard
            </Link>
          )
        ) : (
          <a href={`/api/discord/connect?back=${encodeURIComponent('/onboarding/discord')}`} className={primary}>
            Link Discord
          </a>
        )}
        <Link href="/dashboard" className={quiet}>
          {s.linked ? 'Or open your dashboard' : 'Skip for now'}
        </Link>
      </div>
    </main>
  )
}
