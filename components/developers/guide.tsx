import { ArrowRight, ChevronDown } from 'lucide-react'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { stacks } from '@/lib/dev-snippets'
import { CONTAINER } from '@/lib/layout'
import { ISSUER, SCOPES } from '@/lib/oauth'
import { CodeBlock } from './code-block'
import { BUTTON_SNIPPET, LoginWithLogoless } from './login-button'
import { SetupChecker } from './setup-checker'
import { StackTabs } from './stack-tabs'

const H2 = ({ children, id }: { children: React.ReactNode; id?: string }) => (
  <h2 id={id} className="scroll-mt-28 font-display text-4xl tracking-[-0.035em] md:text-5xl">
    {children}
  </h2>
)
const Lede = ({ children }: { children: React.ReactNode }) => <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-paper/60">{children}</p>

const TROUBLE: { q: string; why: string; fix: string }[] = [
  { q: '"The return address does not match one the app registered"', why: 'The redirect_uri you sent is not exactly one of the return addresses on your app.', fix: 'Compare them character by character: https and http, www, the port, a trailing slash and capital letters all count. Add the exact address to your app in the Developer dashboard. The setup checker above shows the closest match.' },
  { q: '"This app does not exist or has been switched off"', why: 'The client_id is wrong, the app was deleted, or logoless switched it off.', fix: 'Copy the client id again from the Developer dashboard. It starts with lg_. Make sure you did not paste the secret (lgs_…) instead.' },
  { q: '"This app needs PKCE"', why: 'Your app was registered as one that cannot keep a secret, so every sign-in must carry a code_challenge.', fix: 'Send code_challenge and code_challenge_method=S256, then code_verifier when you swap the code. The HTML and React examples do this for you.' },
  { q: 'invalid_client when swapping the code', why: 'The client id or secret is wrong, or the secret was replaced.', fix: 'Server apps: send the secret with HTTP Basic auth (or client_secret in the body), from your server. If you made a new secret, update it everywhere. Browser apps: send client_id in the body and no secret.' },
  { q: 'invalid_grant: "That code is not valid, has already been used, or has expired"', why: 'Codes last five minutes and work once.', fix: 'Swap the code straight away, and only once. In React development mode effects run twice, so guard the callback (the React example already does). Reloading the callback page also tries the same code again.' },
  { q: 'invalid_grant: "The redirect_uri does not match"', why: 'The token request must send the same redirect_uri as the sign-in address.', fix: 'Use one constant for the return address in both places.' },
  { q: 'invalid_grant: "The code_verifier does not match"', why: 'The verifier you kept was lost or replaced before the person came back.', fix: 'Keep it in the session (server) or sessionStorage (browser) for the same address. localhost and 127.0.0.1 are different sites with separate storage.' },
  { q: '"State does not match" in your own app', why: 'Your app lost the state it saved before sending the person to logoless.', fix: 'Save the session before redirecting, use the same host name on the way out and back, and make sure your session cookie is SameSite=Lax (not Strict).' },
  { q: 'A CORS error in the browser', why: 'The browser blocked a request.', fix: 'The token, user info, discovery and keys addresses all allow calls from any site. If you see CORS, the request probably failed for another reason first: open the network tab and read the response. Server apps should never call the token address from the browser.' },
  { q: 'The id_token is rejected by your library', why: 'The issuer, audience or signature check failed.', fix: `The issuer is exactly ${ISSUER} (no trailing slash). aud is your client id. Keys are at ${ISSUER}/.well-known/jwks.json. Check your server clock is right.` },
  { q: '401 invalid_token from user info', why: 'Access tokens last one hour, and stop working when the person disconnects your app.', fix: 'Ask for offline_access to get a refresh token, and swap it for a new access token when the old one runs out. If the person disconnected, send them through sign-in again.' },
  { q: 'slow_down (429)', why: 'More than about 60 token or user info calls a minute from one network.', fix: 'Keep the access token and reuse it for its hour instead of fetching a new one per page.' },
  { q: 'People see "not checked by logoless"', why: 'New apps show this until logoless has looked at them.', fix: 'Write to us from the contact page with your client id, and we will check your app.' },
]

/** The Developers page with the developer tools switched on: quickstart, code for each stack, a live test and troubleshooting. */
export function DevelopersGuide({ signedIn }: { signedIn: boolean }) {
  const register = signedIn ? '/dashboard/developer/new' : '/login?next=/dashboard/developer/new'
  const all = stacks(ISSUER)
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Developers' }]} />
      <PageHero eyebrow="Developers" title="Sign in with logoless" lede="Let people sign in to your site or app with their logoless account, in about ten minutes. It is standard OAuth 2.0 and OpenID Connect, so the library you already use will work.">
        <div className="flex flex-wrap items-center gap-3">
          <PillLink href={register}>Register an app</PillLink>
          <LoginWithLogoless href="/developers/try" />
        </div>
        <p className="mt-4 text-sm text-mute">
          The white button runs a real test sign-in.{' '}
          {signedIn && (
            <a className="underline underline-offset-4 hover:text-paper" href="/dashboard/developer">
              Open your Developer dashboard
            </a>
          )}
        </p>
      </PageHero>

      <section aria-labelledby="quickstart" className={`${CONTAINER} pb-20`}>
        <H2 id="quickstart">Quickstart</H2>
        <Lede>Four steps. Most people are done in ten minutes.</Lede>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
          {[
            { n: '1', t: 'Register your app', b: 'Say what it is and add the address people come back to. You get a client id, and a secret if your app has a server.', href: register, cta: 'Register an app' },
            { n: '2', t: 'Copy the code for your stack', b: 'HTML, Next.js, React, Express or Python. Paste in your client id and you have a working button.', href: '#code', cta: 'See the code' },
            { n: '3', t: 'Try it', b: 'Sign in with your own account. Check your client id and return address before you ship.', href: '#test', cta: 'Test it' },
            { n: '4', t: 'Go live', b: 'Add your real https return address, keep the secret on your server, and ask us to check your app.', href: '#troubleshooting', cta: 'Before you launch' },
          ].map((s) => (
            <li key={s.n} className="flex flex-col bg-ink p-6 md:p-7">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-pill border border-line-strong font-mono text-sm">
                {s.n}
              </span>
              <p className="mt-5 font-display text-2xl tracking-[-0.02em]">{s.t}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{s.b}</p>
              <a href={s.href} className="mt-5 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
                {s.cta} <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="code" className={`${CONTAINER} pb-20`}>
        <H2 id="code">Copy the code for your stack</H2>
        <Lede>Replace YOUR_CLIENT_ID (and the secret, for a server app) with the ones from your Developer dashboard, and register the return address shown.</Lede>
        <div className="mt-8 max-w-4xl">
          <StackTabs stacks={all} />
        </div>
      </section>

      <section aria-labelledby="test" className={`${CONTAINER} pb-20`}>
        <H2 id="test">Test it</H2>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col rounded-card border border-line-strong p-6 md:p-8">
            <p className="font-display text-2xl tracking-[-0.02em]">Try a real sign-in</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">Sign in with your own account through a test app and see every step: the code, the tokens and who signed in. No code needed.</p>
            <div className="mt-6">
              <LoginWithLogoless href="/developers/try" />
            </div>
          </div>
          <div className="rounded-card border border-line-strong p-6 md:p-8">
            <p className="font-display text-2xl tracking-[-0.02em]">Check my setup</p>
            <p className="mt-2 mb-5 text-sm leading-relaxed text-mute">Paste your client id and the return address your code sends. We tell you whether a sign-in will work, and how to fix it if not.</p>
            <SetupChecker issuer={ISSUER} />
          </div>
        </div>
      </section>

      <section aria-labelledby="button" className={`${CONTAINER} pb-20`}>
        <H2 id="button">The button</H2>
        <Lede>Put it where your other sign-in options are. Keep the mark and the words as they are, white on dark pages and black on light ones.</Lede>
        <div className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-line">
            <div className="grid place-items-center bg-black px-10 py-8">
              <LoginWithLogoless />
            </div>
            <div className="grid place-items-center bg-[#f3f2ee] px-10 py-8">
              <LoginWithLogoless dark />
            </div>
          </div>
          <CodeBlock label="HTML (no image to host: the mark is drawn in the code)" code={BUTTON_SNIPPET} className="my-0 min-w-0" />
        </div>
      </section>

      <section aria-labelledby="troubleshooting" className={`${CONTAINER} pb-20`}>
        <H2 id="troubleshooting">Troubleshooting</H2>
        <Lede>The message you see, why it happens and the fix. Most problems are a return address that does not match exactly.</Lede>
        <ul className="mt-8 max-w-4xl divide-y divide-line rounded-card border border-line">
          {TROUBLE.map((t) => (
            <li key={t.q}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] marker:hidden hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[13px] leading-relaxed">{t.q}</span>
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-mute transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-2 px-5 pb-5 text-sm leading-relaxed">
                  <p className="text-mute">{t.why}</p>
                  <p>
                    <span className="text-mute">Fix: </span>
                    {t.fix}
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <div className="mt-8 max-w-4xl rounded-2xl border border-line p-5 text-sm leading-relaxed">
          <p className="font-medium">Before you launch</p>
          <ul className="mt-2 grid gap-1.5 text-paper/70">
            <li>• Your real https return address is added (localhost only works on your own computer).</li>
            <li>• The secret lives on your server only, in an environment variable, never in the browser or a repository.</li>
            <li>• You check state, and nonce in the id_token.</li>
            <li>• You ask only for the scopes you use.</li>
            <li>
              • You <a className="underline underline-offset-4" href="/contact">asked us to check your app</a>, so people do not see the &quot;not checked&quot; note.
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="reference" className={`${CONTAINER} pb-20`}>
        <H2 id="reference">Reference</H2>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="font-display text-2xl">Addresses</h3>
            <p className="mt-2 text-sm text-mute">Libraries find all of these from the issuer, through the discovery document.</p>
            <CodeBlock
              code={`Issuer      ${ISSUER}
Discovery   ${ISSUER}/.well-known/openid-configuration
Keys        ${ISSUER}/.well-known/jwks.json
Authorize   ${ISSUER}/oauth/authorize
Token       ${ISSUER}/api/oauth/token
User info   ${ISSUER}/api/oauth/userinfo
Revoke      ${ISSUER}/api/oauth/revoke`}
            />
            <h3 className="mt-8 font-display text-2xl">How long things last</h3>
            <ul className="mt-3 grid gap-2 text-sm text-paper/70">
              <li>Code: five minutes, one use.</li>
              <li>Access token: one hour. Opaque: do not read it, send it.</li>
              <li>Refresh token: thirty days, only with offline_access. Each use gives a new one and cancels the old.</li>
              <li>id_token: one hour, signed RS256.</li>
              <li>When someone disconnects your app in their Settings, every token ends at once.</li>
            </ul>
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-2xl">Scopes</h3>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {SCOPES.map((s) => (
                <li key={s.id} className="px-4 py-3">
                  <p className="font-mono text-sm">{s.id}</p>
                  <p className="text-xs leading-relaxed text-mute">{s.gives}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mute">Ask only for what you need: every extra one makes people more likely to say no. stats adds a logoless:stats claim with submissions, views, campaigns and badges. Never earnings.</p>
          </div>
        </div>
      </section>

      <section className={`${CONTAINER} pb-28`}>
        <div className="rounded-card border border-line-strong p-8 text-center md:p-14">
          <h2 className="font-display text-4xl tracking-[-0.035em] md:text-5xl">Ready when you are</h2>
          <p className="mx-auto mt-3 max-w-xl text-paper/60">It takes two minutes to get a client id.</p>
          <div className="mt-7 flex justify-center">
            <PillLink href={register}>Register an app</PillLink>
          </div>
        </div>
      </section>
    </main>
  )
}
