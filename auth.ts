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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Google reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, Discord reads AUTH_DISCORD_ID / AUTH_DISCORD_SECRET.
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    ...(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET ? [Discord] : []),
    // Email sign-in with a six-digit code. The code was emailed to the address, so using it proves they own it.
    ...(process.env.RESEND_API_KEY || process.env.NODE_ENV !== 'production'
      ? [
          Credentials({
            id: 'email-code',
            name: 'Email code',
            credentials: { email: {}, code: {} },
            async authorize(c) {
              const email = String(c?.email ?? '').trim().toLowerCase()
              const code = String(c?.code ?? '').trim()
              if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(code)) return null
              const { checkCode } = await import('./lib/email-code')
              return (await checkCode(email, code)) ? { id: email, email, name: email.split('@')[0] } : null
            },
          }),
        ]
      : []),
  ],
  pages: { signIn: '/login', error: '/login' },
  events: {
    async signIn({ user, account, isNewUser }) {
      const { logEvent } = await import('./lib/log')
      logEvent({ kind: 'auth', name: 'signin', actor: user.email?.toLowerCase() ?? null, detail: `${account?.provider ?? 'unknown'}${isNewUser ? ' (new account)' : ''}` })
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
})
