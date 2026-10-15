import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { PageHeader } from '@/components/app/ui'
import { SetupSteps, type SetupStep } from '@/components/app/setup-steps'
import { db } from '@/lib/db'
import { SITE } from '@/lib/site'
import { pageUser } from '@/lib/user'
import { isVerified } from '@/lib/verification'

export const metadata: Metadata = { title: 'Getting set up | logoless', robots: { index: false } }

/** Everything you need to start earning, one step at a time. */
export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [v, profile, pay, clips, paid] = await Promise.all([
    isVerified(user.id, user.email),
    d.prepare('SELECT bio, avatar_key, links_json FROM profiles WHERE user_id = ?1').bind(user.id).first<{ bio: string; avatar_key: string | null; links_json: string }>(),
    d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`paypal:${user.id}`).first(),
    d.prepare('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM payouts WHERE user_id = ?1 AND status = 'sent'").bind(user.id).first<{ n: number }>(),
  ])
  const steps: SetupStep[] = [
    {
      id: 'verify',
      title: 'Confirm it is you',
      short: 'We email you a six digit code.',
      why: 'It proves the account is really yours. It keeps your earnings safe and stops anyone signing up as you.',
      done: v.verified,
    },
    {
      id: 'profile',
      title: 'Make your profile yours',
      short: 'Add a picture and a line about you.',
      why: 'Brands and other clippers see this page, so it is worth two minutes. Pick a banner and your colours too.',
      done: Boolean(profile?.avatar_key) || Boolean(profile?.bio?.trim()),
      href: '/dashboard/profile',
      cta: 'Edit profile',
    },
    {
      id: 'accounts',
      title: 'Link your clipping accounts',
      short: 'The TikTok, YouTube or Instagram accounts you post from.',
      why: 'Linking lets us match your clips to you. You choose whether they show on your public page.',
      done: Boolean(profile && profile.links_json !== '[]'),
      href: '/dashboard/accounts',
      cta: 'Link accounts',
    },
    {
      id: 'paypal',
      title: 'Add a PayPal email',
      short: 'This is where your earnings are sent.',
      why: "You can add a few and pick one each time you withdraw. We pay PayPal's fees, so the whole amount arrives.",
      done: Boolean(pay),
      href: '/dashboard/earnings#withdraw',
      cta: 'Add PayPal',
    },
    {
      id: 'clip',
      title: 'Send your first clip',
      short: 'Pick a campaign, post a clip, paste the link.',
      why: 'Every campaign has a brief, a rate per 1,000 views and rules. Read what is allowed, post on your own account, then paste the link on the campaign. We check it and you see the result on your Clips page.',
      done: (clips?.n ?? 0) > 0,
      href: '/',
      cta: 'Browse campaigns',
    },
    {
      id: 'paid',
      title: 'Get paid',
      short: `Withdraw once you have $${SITE.minPayoutUsd} available.`,
      why: `Approved views are paid at the campaign's rate. Earnings clear for ${SITE.holdDays} days, then they are yours to withdraw. Nothing is ever taken out of what you earn.`,
      done: (paid?.n ?? 0) > 0,
      href: '/dashboard/earnings',
      cta: 'See earnings',
    },
  ]

  return (
    <>
      <PageHeader title="Getting set up" sub="One step at a time, from signing up to your first payout." actions={<ActionLink href="/" variant="ghost">Find a campaign</ActionLink>} />
      <SetupSteps steps={steps} email={user.email} />
    </>
  )
}
