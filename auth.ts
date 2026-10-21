import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Discord from 'next-auth/providers/discord'
import Google from 'next-auth/providers/google'

const admins = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/** True once Google credentials are present. Until then the private pages stay open so the UI can be previewed. */
export const authConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/**
 * One sign-in for logoless.io, dev.logoless.io and owner.logoless.io: on those addresses the session cookie is set for the
 * whole domain. Anywhere else (a local machine) it stays on the address it was made on.
 */
const sharedCookies = (req?: Request) => {
  const host = (req?.headers.get('host') ?? '').toLowerCase().split(':')[0]
  if (!(host === 'logoless.io' || host.endsWith('.logoless.io'))) return {}
  return { cookies: { sessionToken: { name: '__Secure-authjs.session-token', options: { httpOnly: true, sameSite: 'lax' as const, path: '/', secure: true, domain: '.logoless.io' } } } }
}

export const { handlers, auth, signIn, signOut } = NextAuth((req) => ({
  ...sharedCookies(req),
  trustHost: true,
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, Discord reads AUTH_DISCORD_ID / AUTH_DISCORD_SECRET.
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    // identify + email to sign in, and guilds.join so the same approval lets the bot add them to the logoless server
    ...(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET ? [Discord({ authorization: { params: { scope: 'identify email guilds.join' } } })] : []),
    // Email and password. The password is checked against a salted hash, and the address was proven by an emailed code.
    Credentials({
      id: 'password',
      name: 'Email and password',
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const email = String(c?.email ?? '').trim().toLowerCase()
        const password = String(c?.password ?? '')
        if (!/^\S+@\S+\.\S+$/.test(email) || !password || password.length > 200) return null
        const [{ hit }, { db }, { verifyPassword }, { logEvent }] = await Promise.all([import('./lib/guard'), import('./lib/db'), import('./lib/password'), import('./lib/log')])
        // At most 10 tries per address every 15 minutes, however many networks they come from.
        if ((await hit(`login:addr:${email}`, 900)) > 10) return null
        const row = await (await db()).prepare('SELECT password_hash FROM credentials WHERE email = ?1').bind(email).first<{ password_hash: string }>()
        const ok = await verifyPassword(password, row?.password_hash)
        if (!ok) {
          logEvent({ kind: 'security', name: 'login failed', actor: email, detail: row ? 'wrong password' : 'no password on file' })
          return null
        }
        return { id: email, email, name: email.split('@')[0] }
      },
    }),
    // Finishing sign-up: the six-digit code emailed to the address creates the account and signs the person in.
    Credentials({
      id: 'email-code',
      name: 'Confirm email',
      credentials: { email: {}, code: {} },
      async authorize(c) {
        const email = String(c?.email ?? '').trim().toLowerCase()
        const code = String(c?.code ?? '').trim()
        if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) return null
        const [{ checkCode }, { db, nowSec }, { findOrCreateUser }] = await Promise.all([import('./lib/email-code'), import('./lib/db'), import('./lib/user')])
        const ok = await checkCode(email, 'signup', code)
        if (!ok?.payload) return null
        const { hash, name } = JSON.parse(ok.payload) as { hash: string; name?: string }
        const user = await findOrCreateUser(email, name || email.split('@')[0])
        const t = nowSec()
        const res = await (await db())
          .prepare('INSERT OR IGNORE INTO credentials (email, user_id, password_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)')
          .bind(email, user.id, hash, t)
          .run()
        if (res.meta.changes !== 1) return null // someone else finished first
        return { id: email, email, name: user.name ?? email.split('@')[0] }
      },
    }),
  ],
  pages: { signIn: '/login', error: '/login' },
  events: {
    async signIn({ user, account, isNewUser }) {
      const { logEvent } = await import('./lib/log')
      logEvent({ kind: 'auth', name: 'signin', actor: user.email?.toLowerCase() ?? null, detail: `${account?.provider ?? 'unknown'}${isNewUser ? ' (new account)' : ''}` })
      // Remember the Discord id, so the logoless bot can message this person later.
      if (account?.provider === 'discord' && account.providerAccountId && user.email) {
        try {
          const { db, nowSec } = await import('./lib/db')
          const d = await db()
          await d
            .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
            .bind(`discord-email:${user.email.toLowerCase()}`, account.providerAccountId, nowSec())
            .run()
        } catch {
          /* the id is a convenience; signing in must never fail because of it */
        }
        // the approval they just gave also lets the bot add them to the server (done in the background, never blocks signing in)
        const { joinAfterSignIn } = await import('./lib/discord/connect')
        const job = joinAfterSignIn(account.providerAccountId, account.access_token)
        try {
          const { getCloudflareContext } = await import('@opennextjs/cloudflare')
          getCloudflareContext().ctx.waitUntil(job)
        } catch {
          void job
        }
      }
    },
    async signOut(message) {
      const { logEvent } = await import('./lib/log')
      const email = 'token' in message ? (message.token?.email as string | undefined) : undefined
      logEvent({ kind: 'auth', name: 'signout', actor: email?.toLowerCase() ?? null })
    },
  },
  // Two weeks, not a month: a stolen session cookie stops working sooner.
  session: { strategy: 'jwt', maxAge: 14 * 24 * 60 * 60 },
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
    // Accounts are matched by email, so only a provider-verified email may sign in. Otherwise someone could make a
    // Discord account with a stranger's email address (unverified) and walk into that stranger's account.
    signIn({ account, profile }) {
      if (account?.provider === 'discord') return (profile as { verified?: boolean } | undefined)?.verified === true
      if (account?.provider === 'google') return (profile as { email_verified?: boolean } | undefined)?.email_verified === true
      return true
    },
    // After signing in, people may be sent back to the dev, admin or scroll address, but nowhere else.
    redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      try {
        const u = new URL(url)
        if (u.origin === baseUrl || /^https:\/\/(owner|admin|dev|scroll)\.logoless\.io$/.test(u.origin)) return url
      } catch {
        /* not a URL */
      }
      return baseUrl
    },
    // TODO(backend): look the user up in your database here and put their real role (clipper, brand, admin) in the token.
    jwt({ token }) {
      token.role = admins.includes((token.email ?? '').toLowerCase()) ? 'admin' : 'user'
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.role = (token.role as string | undefined) ?? 'user'
      return session
    },
  },
}))
