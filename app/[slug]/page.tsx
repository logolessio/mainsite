import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { InviteBlocked } from '@/components/invite/invite-blocked'
import { InviteWelcome } from '@/components/invite/invite-welcome'
import { InviteWizard } from '@/components/invite/invite-wizard'
import { db, nowSec } from '@/lib/db'
import { STEPS } from '@/lib/invite-shared'
import { inviteBySlug, maskEmail, parseData } from '@/lib/invites'
import { getSession } from '@/lib/session'
import { findOrCreateUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Your logoless page', robots: { index: false, follow: false } }

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ paid?: string; cancelled?: string }> }

/**
 * logoless.io/<name>: a private page an admin made for an artist. Signed-out visitors see a welcome, the right account
 * claims the link, and the owner is walked through setting up their page and first campaign.
 */
export default async function Page({ params, searchParams }: Props) {
  await connection()
  const { slug: raw } = await params
  const q = await searchParams
  const slug = raw.toLowerCase()
  const inv = await inviteBySlug(slug).catch(() => null)
  if (!inv) notFound()
  if (inv.status === 'revoked') return <InviteBlocked kind="off" slug={slug} />

  const session = await getSession()
  const email = session?.user?.email?.toLowerCase()
  const isAdmin = session?.user?.role === 'admin'
  const lockedTo = inv.email_lock && inv.contact_email ? maskEmail(inv.contact_email) : null
  const d = await db()

  if (!email) {
    await d.prepare('UPDATE artist_invites SET opens = opens + 1, opened_at = COALESCE(opened_at, ?2) WHERE id = ?1').bind(inv.id, nowSec()).run().catch(() => null)
    return <InviteWelcome name={inv.artist_name} slug={slug} state="signedOut" lockedTo={lockedTo} />
  }

  const user = await findOrCreateUser(email, session?.user?.name, session?.user?.image)
  if (user.status !== 'active') return <InviteBlocked kind="off" slug={slug} />

  if (!inv.user_id) {
    if (!isAdmin) {
      if (inv.email_lock && inv.contact_email && inv.contact_email.toLowerCase() !== email) return <InviteBlocked kind="email" slug={slug} hint={maskEmail(inv.contact_email)} />
      await d.prepare('UPDATE artist_invites SET opens = opens + 1, opened_at = COALESCE(opened_at, ?2) WHERE id = ?1').bind(inv.id, nowSec()).run().catch(() => null)
    }
    return <InviteWelcome name={inv.artist_name} slug={slug} state="unclaimed" email={email} lockedTo={lockedTo} admin={isAdmin} />
  }

  if (inv.user_id !== user.id) return <InviteBlocked kind="taken" slug={slug} />

  const camp = inv.campaign_id ? await d.prepare('SELECT id, title, status, budget_cents FROM campaigns WHERE id = ?1').bind(inv.campaign_id).first<{ id: string; title: string; status: string; budget_cents: number }>() : null
  return (
    <InviteWizard
      slug={slug}
      artistName={inv.artist_name}
      email={email}
      initialStep={Math.min(inv.step, STEPS.length - 1)}
      initialData={parseData(inv.data_json)}
      campaign={camp ? { id: camp.id, title: camp.title, status: camp.status, budgetCents: camp.budget_cents } : null}
      flash={q.paid ? 'paid' : q.cancelled ? 'cancelled' : null}
    />
  )
}
