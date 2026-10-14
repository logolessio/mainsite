import type { Metadata } from 'next'
import { Check } from 'lucide-react'
import { ActionLink } from '@/components/app/action-link'
import { PageHeader } from '@/components/app/ui'
import { VerifyCard } from '@/components/app/verify-card'
import { db } from '@/lib/db'
import { SITE } from '@/lib/site'
import { pageUser } from '@/lib/user'
import { isVerified } from '@/lib/verification'

export const metadata: Metadata = { title: 'Getting set up | logoless', robots: { index: false } }

const FLOW = [
  { n: '1', t: 'Find', b: 'Browse campaigns and pick one you would actually clip.' },
  { n: '2', t: 'Clip', b: 'Cut your clip and post it on TikTok, YouTube or Instagram.' },
  { n: '3', t: 'Submit', b: 'Paste the link. We check it against the brief in seconds.' },
  { n: '4', t: 'Earn', b: `Approved views turn into money. It clears in ${SITE.holdDays} days, then you withdraw.` },
]

/** Everything you need to start earning, in order, with what each step is for. */
export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [v, profile, pay, clips] = await Promise.all([
    isVerified(user.id, user.email),
    d.prepare('SELECT bio, avatar_key, banner_value, banner_kind, links_json FROM profiles WHERE user_id = ?1').bind(user.id).first<{ bio: string; avatar_key: string | null; banner_value: string; banner_kind: string; links_json: string }>(),
    d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`paypal:${user.id}`).first(),
    d.prepare('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ n: number }>(),
  ])
  const steps: { id: string; title: string; why: string; done: boolean; href?: string; cta?: string; extra?: React.ReactNode }[] = [
    {
      id: 'verify',
      title: 'Confirm it is you',
      why: 'We email a six digit code to prove the account is really yours. It keeps your earnings safe and stops anyone signing up as you.',
      done: v.verified,
      extra: v.verified ? null : <VerifyCard email={user.email} />,
    },
    {
      id: 'profile',
      title: 'Make your profile yours',
      why: 'Your picture, banner and a line about you. Brands and other clippers see this page, so it is worth two minutes.',
      done: Boolean(profile?.avatar_key) || Boolean(profile?.bio?.trim()),
      href: '/dashboard/profile',
      cta: 'Edit profile',
    },
    {
      id: 'accounts',
      title: 'Link your clipping accounts',
      why: 'Add the TikTok, YouTube or Instagram accounts you post from. You decide whether they show on your public page. Linking lets us match your clips to you.',
      done: Boolean(profile && profile.links_json !== '[]'),
      href: '/dashboard/accounts',
      cta: 'Link accounts',
    },
    {
      id: 'paypal',
      title: 'Add a PayPal email',
      why: `This is where your earnings go. You can add a few and pick one each time you withdraw. We pay PayPal's fees, so the whole amount arrives.`,
      done: Boolean(pay),
      href: '/dashboard/earnings#withdraw',
      cta: 'Add PayPal',
    },
    {
      id: 'campaign',
      title: 'Pick a campaign',
      why: 'Every campaign has a brief, a rate per 1,000 views and rules. Open one, play the preview, and read what is allowed before you start.',
      done: (clips?.n ?? 0) > 0,
      href: '/',
      cta: 'Browse campaigns',
    },
    {
      id: 'clip',
      title: 'Post and submit your first clip',
      why: 'Post the clip on your account, copy its link and paste it into the campaign. We check it, and you see the result on your Clips page.',
      done: (clips?.n ?? 0) > 0,
      href: '/dashboard/submissions',
      cta: 'Your clips',
    },
    {
      id: 'paid',
      title: 'Get paid',
      why: `Approved views are paid at the campaign's rate. Earnings clear for ${SITE.holdDays} days, then you can withdraw from $${SITE.minPayoutUsd}. Nothing is ever taken out of what you earn.`,
      done: false,
      href: '/dashboard/earnings',
      cta: 'See earnings',
    },
  ]
  const done = steps.filter((s) => s.done).length

  return (
    <>
      <PageHeader title="Getting set up" sub="Seven short steps from signing up to your first payout." actions={<ActionLink href="/">Find a campaign</ActionLink>} />

      <ol className="grid gap-px overflow-hidden rounded-[2rem] border border-line bg-line sm:grid-cols-4" aria-label="How it works">
        {FLOW.map((f) => (
          <li key={f.n} className="bg-ink p-6">
            <p className="font-mono text-xs text-mute">{f.n}</p>
            <p className="mt-3 font-display text-2xl tracking-[-0.03em]">{f.t}</p>
            <p className="mt-2 text-sm leading-relaxed text-mute">{f.b}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 flex items-end justify-between border-b border-line pb-4">
        <h2 className="font-display text-3xl tracking-[-0.03em]">Your steps</h2>
        <p className="text-[15px] text-paper/50 tabular-nums">
          {done} of {steps.length} done
        </p>
      </div>
      <div className="h-px bg-line">
        <div className="h-px bg-paper transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ol className="max-w-3xl">
        {steps.map((s, i) => (
          <li key={s.id} className="flex gap-5 border-b border-line py-7">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full border text-sm ${s.done ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute'}`}>{s.done ? <Check className="size-4" /> : i + 1}</span>
            <div className="min-w-0">
              <h3 className="font-display text-2xl tracking-[-0.025em]">{s.title}</h3>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-mute">{s.why}</p>
              {s.extra}
              {s.href && (
                <div className="mt-4">
                  <ActionLink href={s.href} variant={s.done ? 'ghost' : 'solid'}>
                    {s.done ? 'Open' : s.cta}
                  </ActionLink>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
