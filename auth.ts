import NextAuth from 'next-auth'
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
  ],
  pages: { signIn: '/login', error: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
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
