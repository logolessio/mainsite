import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RoleEditor } from '@/components/admin/role-editor'
import { AdminButton } from '@/components/admin/ui'
import { Badge } from '@/components/app/table'
import { labelOf, statesFor } from '@/lib/bio-verify'
import { DeleteAccountButton } from '@/components/admin/delete-account-button'
import { AdjustMoney, MessageBox, Moderation, Recognise } from '@/components/admin/user-actions'
import { ActionLink } from '@/components/app/action-link'
import { Card, PageHeader } from '@/components/app/ui'
import { ProfileCard, type ProfileLinkOut } from '@/components/profile/profile-card'
import { botReady, discordIdOf } from '@/lib/discord-bot'
import { db } from '@/lib/db'
import { money, when } from '@/lib/format'
import { profileByHandle, profileStats } from '@/lib/profile'
import { CLIPPING_PLATFORMS, LINK_PLATFORMS } from '@/lib/profile-style'
import { ownerEmails, rolesOf } from '@/lib/roles'
import { getSession } from '@/lib/session'
import { pageAdmin } from '@/lib/user'
import { isVerified } from '@/lib/verification'

export const metadata: Metadata = { title: 'Person | logoless', robots: { index: false } }

type U = { id: string; email: string; name: string | null; status: string; risk_level: string; created_at: number; last_seen_at: number | null; signup_country: string | null; handle: string | null }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await pageAdmin()
  const { id } = await params
  const d = await db()
  const u = await d
    .prepare('SELECT u.id, u.email, u.name, u.status, u.risk_level, u.created_at, u.last_seen_at, u.signup_country, p.handle FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1')
    .bind(id)
    .first<U>()
  if (!u) notFound()
  const [owners, roles, session, stats, prof, discord, bot, ver, accounts] = await Promise.all([ownerEmails(), rolesOf(u.id), getSession(), profileStats(u.id), u.handle ? profileByHandle(u.handle) : null, discordIdOf(u.id), botReady(), isVerified(u.id, u.email), statesFor(u.id)])
  const isOwner = owners.includes(u.email.toLowerCase())
  const viewerIsOwner = owners.includes((session?.user?.email ?? '').toLowerCase())
  const links: ProfileLinkOut[] = []
  for (const l of prof?.view.links ?? []) {
    const meta = LINK_PLATFORMS.find((m) => m.id === l.platform)
    if (meta && CLIPPING_PLATFORMS.includes(l.platform)) links.push({ platform: l.platform, href: l.url, label: meta.label })
  }
  return (
    <>
      <PageHeader title={prof?.view.displayName ?? u.name ?? u.email.split('@')[0]} sub={u.email} actions={<ActionLink href="/admin/people" variant="ghost">All people</ActionLink>} />
      <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
        <div>
          {prof ? (
            <ProfileCard view={prof.view} stats={{ clips: stats.clips, views: stats.views, earnedCents: stats.earnedCents, campaigns: stats.campaigns }} links={links} isOwner={false} />
          ) : (
            <p className="w-[min(440px,calc(100vw-2rem))] rounded-[22px] border border-line p-8 text-sm text-mute">This person has not set up a profile yet.</p>
          )}
        </div>
        <div className="grid max-w-2xl gap-6">
          <Card title="Roles" sub="Set by the owner. Changing a role asks for your admin password and tells the person.">
            <RoleEditor userId={u.id} initial={roles} owner={isOwner} canEdit={viewerIsOwner} />
          </Card>
          <Card title="Account">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-mute">Status</dt>
              <dd className="capitalize">{u.status}</dd>
              <dt className="text-mute">Joined</dt>
              <dd>{when(u.created_at)}</dd>
              <dt className="text-mute">Last seen</dt>
              <dd>{u.last_seen_at ? when(u.last_seen_at) : 'Never'}</dd>
              <dt className="text-mute">Country</dt>
              <dd>{u.signup_country ?? 'Unknown'}</dd>
              <dt className="text-mute">Earned</dt>
              <dd>{money(stats.earnedCents)}</dd>
              <dt className="text-mute">Discord</dt>
              <dd>{discord ? (bot ? 'Linked, the bot can message them' : 'Linked, bot not set up yet') : 'Not linked'}</dd>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {!isOwner && <DeleteAccountButton id={u.id} email={u.email} />}
            </div>
          </Card>
          {accounts.length > 0 && (
            <Card title="Linked accounts" sub="Proven by a code in the bio. Check a bio by hand when the site could not read it, or take a verification away.">
              <ul className="divide-y divide-line">
                {accounts.map((a) => (
                  <li key={a.platform} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="flex flex-wrap items-center gap-2 text-[15px]">
                        {labelOf(a.platform)} {a.handle && <a href={a.profileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-mute underline underline-offset-4 hover:text-paper">@{a.handle}</a>}
                        {a.status === 'verified' && <Badge tone="good">verified{a.by === 'team' ? ' by the team' : ''}</Badge>}
                        {a.status === 'waiting' && <Badge tone="warn">waiting for you</Badge>}
                        {a.status === 'code' && <Badge>code issued</Badge>}
                        {a.status === 'none' && <Badge>not started</Badge>}
                      </p>
                      {a.code && a.status !== 'verified' && <p className="mt-1 text-xs text-mute">Look for <span className="font-mono text-paper select-all">{a.code}</span> in the bio.</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(a.status === 'waiting' || a.status === 'code') && (
                        <AdminButton variant="solid" url="/api/admin/account-verify" data={{ userId: u.id, platform: a.platform, action: 'approve' }} confirm={`Mark @${a.handle} on ${labelOf(a.platform)} as verified? Only do this if you can see ${a.code} in its bio.`}>
                          Approve
                        </AdminButton>
                      )}
                      {a.status === 'waiting' && (
                        <AdminButton url="/api/admin/account-verify" data={{ userId: u.id, platform: a.platform, action: 'decline' }}>
                          Not there
                        </AdminButton>
                      )}
                      {(a.status === 'verified' || a.status === 'code') && (
                        <AdminButton variant="danger" url="/api/admin/account-verify" data={{ userId: u.id, platform: a.platform, action: 'remove' }} confirm="Take this verification away?">
                          Remove
                        </AdminButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Message" sub="Send them a notification, and optionally an email.">
            <MessageBox id={u.id} />
          </Card>
          {!isOwner && (
            <>
              <Card title="Moderation" sub="Suspend, ban or add extra checks. They are told why.">
                <Moderation id={u.id} status={u.status} risk={u.risk_level} />
              </Card>
              <Card title="Money" sub="Correct a balance by hand. Needs your admin password and a reason the person can see.">
                <AdjustMoney id={u.id} />
              </Card>
            </>
          )}
          <Card title="Verification and badges">
            <Recognise id={u.id} verified={ver.verified} />
          </Card>
        </div>
      </div>
    </>
  )
}
