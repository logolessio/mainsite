import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { ConsentForm } from '@/components/developers/consent-form'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { getGrant, issueCode, saveGrant } from '@/lib/oauth'
import { checkAuthRequest, codeRedirect, enc, errorRedirect } from '@/lib/oauth-request'
import { getSession } from '@/lib/session'
import { findOrCreateUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Sign in with logoless', robots: { index: false, follow: false } }

const Problem = ({ text }: { text: string }) => (
  <main className={`${CONTAINER} grid min-h-dvh place-items-center py-24`}>
    <div className="max-w-md rounded-[2rem] border border-line-strong p-8 text-center">
      <h1 className="font-display text-3xl tracking-[-0.03em]">We could not continue</h1>
      <p className="mt-3 text-mute">{text}</p>
      <p className="mt-5 text-sm text-mute">Nothing was shared. Go back to the app and try again.</p>
    </div>
  </main>
)

/** Where another site sends someone to sign in with logoless. The person sees who is asking and what for, and decides. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection()
  if (!(await featureOn('developers'))) notFound()
  const raw = await searchParams
  const sp: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') sp[k] = v
  const check = await checkAuthRequest(sp)
  if ('fatal' in check) return <Problem text={check.fatal} />
  if ('fail' in check) redirect(errorRedirect(check.fail))
  const r = check.ok
  const here = `/oauth/authorize?${Object.entries(sp).map(([k, v]) => `${k}=${enc(v)}`).join('&')}`

  const session = await getSession()
  const email = session?.user?.email
  if (!email) {
    if (r.prompt === 'none') redirect(errorRedirect({ redirectUri: r.redirectUri, error: 'login_required', description: 'Nobody is signed in.', state: r.state }))
    redirect(`/login?next=${enc(here)}`)
  }
  const user = await findOrCreateUser(email, session.user?.name, session.user?.image)
  if (user.status !== 'active') return <Problem text="This account cannot sign in to other apps right now." />

  const grant = await getGrant(user.id, r.app.id)
  const covered = Boolean(grant) && r.scope.every((s) => grant!.scope.includes(s))
  if (covered && r.prompt !== 'consent') {
    // already agreed to this much: straight back, like any single sign-on
    await saveGrant(user.id, r.app.id, r.scope)
    const code = await issueCode({ clientId: r.app.id, userId: user.id, redirectUri: r.redirectUri, scope: r.scope, nonce: r.nonce, challenge: r.challenge })
    redirect(codeRedirect(r.redirectUri, code, r.state))
  }
  if (r.prompt === 'none') redirect(errorRedirect({ redirectUri: r.redirectUri, error: 'consent_required', description: 'The person has not agreed yet.', state: r.state }))

  const d = await db()
  const p = await d.prepare('SELECT handle, display_name, avatar_key FROM profiles WHERE user_id = ?1').bind(user.id).first<{ handle: string; display_name: string; avatar_key: string | null }>()
  return (
    <main className={`${CONTAINER} grid min-h-dvh place-items-center py-24`}>
      <ConsentForm
        app={{ name: r.app.name, description: r.app.description, website: r.app.website, verified: r.app.verified }}
        person={{ name: p?.display_name ?? user.name ?? email.split('@')[0], handle: p?.handle ?? '', avatar: p?.avatar_key ? `/api/img/${p.avatar_key}` : null }}
        scope={r.scope}
        already={grant?.scope ?? []}
        params={{ client_id: r.app.id, redirect_uri: r.redirectUri, scope: r.scope.join(' '), ...(r.state ? { state: r.state } : {}), ...(r.nonce ? { nonce: r.nonce } : {}), ...(r.challenge ? { code_challenge: r.challenge, code_challenge_method: 'S256' } : {}) }}
        retry={here}
      />
    </main>
  )
}
