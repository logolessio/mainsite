import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { DevelopersGuide } from '@/components/developers/guide'
import { BUTTON_SNIPPET, LoginWithLogoless } from '@/components/developers/login-button'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { ISSUER, SCOPES } from '@/lib/oauth'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Developers: Sign in with logoless',
  description: 'Add Sign in with logoless to your site or app. Standard OAuth 2.0 and OpenID Connect, with profile, email and creator stats if the person agrees.',
  alternates: { canonical: '/developers' },
}

const Code = ({ children, label }: { children: string; label?: string }) => (
  <figure className="my-4 overflow-hidden rounded-2xl border border-line bg-black/50">
    {label && <figcaption className="border-b border-line px-4 py-2 font-mono text-[11px] text-mute">{label}</figcaption>}
    <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-paper/85">{children}</pre>
  </figure>
)

const Step = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <li className="grid gap-3 border-t border-line py-9 md:grid-cols-[4rem_1fr]">
    <span className="font-mono text-sm text-mute">{n}</span>
    <div>
      <h3 className="font-display text-2xl tracking-[-0.03em] md:text-3xl">{title}</h3>
      <div className="mt-3 max-w-3xl text-[16px] leading-relaxed text-paper/70">{children}</div>
    </div>
  </li>
)

export default async function Page() {
  await connection()
  if (!(await featureOn('developers'))) notFound()
  if (await featureOn('developer-tools')) return <DevelopersGuide signedIn={Boolean((await getSession())?.user?.email)} />
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Developers' }]} />
      <PageHero eyebrow="Developers" title="Sign in with logoless" lede="Let people sign in to your site or app with their logoless account. It is standard OAuth 2.0 and OpenID Connect, so any library you already use will work.">
        <div className="flex flex-wrap gap-3">
          <PillLink href="/developers/apps">Register an app</PillLink>
          <LoginWithLogoless />
        </div>
      </PageHero>

      <section className={`${CONTAINER} pb-16`}>
        <div className="grid gap-px overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['A real identity', 'One account per person, with a stable id that is different for every app, so apps cannot compare notes.'],
            ['Profile', 'Name, @handle, picture and a link to the public profile.'],
            ['Email, if they agree', 'With a flag that says whether it was verified.'],
            ['Creator stats, if they agree', 'Submissions, verified views and the badges they show. Never earnings, balances or PayPal.'],
          ].map(([t, b]) => (
            <div key={t} className="bg-ink p-6">
              <p className="font-display text-xl tracking-[-0.02em]">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-mute">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="guide" className={`${CONTAINER} pb-16`}>
        <h2 className="font-display text-4xl tracking-[-0.035em] md:text-5xl">Five steps</h2>
        <ol className="mt-8">
          <Step n="1" title="Register your app">
            <p>
              Open <a className="underline underline-offset-4" href="/developers/apps">Your apps</a>, give it a name and add the addresses people are sent back to. You get a <b>client id</b>, and for a server app a <b>client secret</b> (shown once). Choose <i>Browser or phone only</i> if there is nowhere safe to keep a secret: you will use PKCE instead.
            </p>
          </Step>
          <Step n="2" title="Send people to logoless">
            <p>Make a button that goes to this address. Use a random <code>state</code> for each attempt and check it when they come back. For a browser or phone app, add a PKCE challenge (see below).</p>
            <Code label="The sign-in address">{`${ISSUER}/oauth/authorize
  ?response_type=code
  &client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fexample.com%2Fauth%2Flogoless%2Fcallback
  &scope=openid%20profile%20email
  &state=A_RANDOM_STRING
  &nonce=ANOTHER_RANDOM_STRING`}</Code>
            <p>They sign in to logoless if they are not already, see who is asking and what for, and press Allow. Then they come back to your return address with <code>?code=…&amp;state=…</code>.</p>
          </Step>
          <Step n="3" title="Swap the code for tokens">
            <p>From your server (never the browser, for a server app), send the code within five minutes. It works once.</p>
            <Code label="Exchange the code">{`curl -X POST ${ISSUER}/api/oauth/token \\
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \\
  -d grant_type=authorization_code \\
  -d code=THE_CODE \\
  -d redirect_uri=https://example.com/auth/logoless/callback`}</Code>
            <Code label="You get back">{`{
  "access_token": "lga_…",       // one hour
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJ…",             // who they are, signed by logoless (RS256)
  "refresh_token": "lgr_…",      // only if you asked for offline_access
  "scope": "openid profile email"
}`}</Code>
          </Step>
          <Step n="4" title="Find out who they are">
            <p>Either read the <code>id_token</code> (check its signature with our keys, and that <code>aud</code> is your client id and <code>nonce</code> is yours), or ask the userinfo address:</p>
            <Code label="Who is this?">{`curl ${ISSUER}/api/oauth/userinfo \\
  -H "Authorization: Bearer lga_…"

{
  "sub": "5f2c…",                       // their id, only for your app
  "name": "dune",
  "preferred_username": "dune",
  "picture": "${ISSUER}/api/img/…",
  "profile": "${ISSUER}/@dune",
  "email": "dune@example.com",
  "email_verified": true
}`}</Code>
            <p>Use <code>sub</code> as the key for your own user table. It never changes for that person in your app.</p>
          </Step>
          <Step n="5" title="Add the button">
            <p>Put this on your sign-in page. White on dark, with the wordmark and plain words, and please leave it as it is.</p>
            <div className="my-4 flex flex-wrap items-center gap-4 rounded-2xl border border-line p-6">
              <LoginWithLogoless />
              <LoginWithLogoless dark />
            </div>
            <Code label="HTML">{BUTTON_SNIPPET}</Code>
          </Step>
        </ol>
      </section>

      <section className={`${CONTAINER} pb-16`}>
        <h2 className="font-display text-4xl tracking-[-0.035em] md:text-5xl">The details</h2>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl">Addresses</h3>
            <p className="mt-2 text-sm text-mute">Libraries can find all of these from one place: give them the issuer and they read the discovery document.</p>
            <Code>{`Issuer      ${ISSUER}
Discovery   ${ISSUER}/.well-known/openid-configuration
Keys        ${ISSUER}/.well-known/jwks.json
Authorize   ${ISSUER}/oauth/authorize
Token       ${ISSUER}/api/oauth/token
User info   ${ISSUER}/api/oauth/userinfo
Revoke      ${ISSUER}/api/oauth/revoke`}</Code>
          </div>
          <div>
            <h3 className="font-display text-2xl">Scopes</h3>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {SCOPES.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <p className="font-mono text-sm">{s.id}</p>
                  <p className="text-xs leading-relaxed text-mute">{s.gives}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mute">Ask only for what you need. Anything more makes people say no. The stats scope adds a <code>logoless:stats</code> claim with submissions, views, campaigns and badges.</p>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl">Browser and phone apps: PKCE</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">With no secret to keep, you prove it is the same app by sending a one-time challenge. Required for these apps, and a good idea for server apps too.</p>
            <Code label="JavaScript">{`const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
const challenge = base64url(
  await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
)
// keep the verifier, add to the sign-in address:
//   &code_challenge=\${challenge}&code_challenge_method=S256
// then send code_verifier=\${verifier} (and no secret) to the token address`}</Code>
          </div>
          <div>
            <h3 className="font-display text-2xl">With a library</h3>
            <p className="mt-2 text-sm leading-relaxed text-mute">For example in Auth.js:</p>
            <Code label="auth.ts">{`{
  id: 'logoless',
  name: 'logoless',
  type: 'oidc',
  issuer: '${ISSUER}',
  clientId: process.env.LOGOLESS_ID,
  clientSecret: process.env.LOGOLESS_SECRET,
}`}</Code>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl">How long things last</h3>
            <ul className="mt-3 grid gap-2 text-sm text-paper/70">
              <li>Code: five minutes, one use.</li>
              <li>Access token: one hour. Opaque: do not read it, send it.</li>
              <li>Refresh token: thirty days, only with <code>offline_access</code>. Each use gives you a new one and cancels the old.</li>
              <li>id_token: one hour, signed RS256. Check the signature with the keys address.</li>
              <li>Disconnecting in Settings ends every token at once.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-display text-2xl">Rules of the road</h3>
            <ul className="mt-3 grid gap-2 text-sm text-paper/70">
              <li>Return addresses must match exactly, and be https (http://localhost works for testing).</li>
              <li>Always check <code>state</code>. Check <code>nonce</code> in the id_token.</li>
              <li>Keep the secret on your server. If it leaks, make a new one in Your apps.</li>
              <li>Token and user info calls are limited to about 60 a minute per network.</li>
              <li>New apps show people a note that logoless has not checked them yet. <a className="underline underline-offset-4" href="/contact">Write to us</a> and we will look at yours.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pb-28`}>
        <div className="rounded-[calc(2rem*var(--round,1))] border border-line-strong p-8 text-center md:p-14">
          <h2 className="font-display text-4xl tracking-[-0.035em] md:text-5xl">Ready when you are</h2>
          <p className="mx-auto mt-3 max-w-xl text-paper/60">It takes two minutes to get a client id.</p>
          <div className="mt-7 flex justify-center">
            <PillLink href="/developers/apps">Register an app</PillLink>
          </div>
        </div>
      </section>
    </main>
  )
}
