// The things an app can ask for. Safe for the browser: no secrets.

export type Scope = 'openid' | 'profile' | 'email' | 'stats' | 'offline_access'
export const SCOPES: { id: Scope; label: string; gives: string }[] = [
  { id: 'openid', label: 'Know who you are', gives: 'A stable id that is the same only for that app. It is not your logoless id.' },
  { id: 'profile', label: 'See your public profile', gives: 'Your name, @handle, picture and a link to your profile.' },
  { id: 'email', label: 'See your email address', gives: 'Your email, and whether it is verified.' },
  { id: 'stats', label: 'See your creator numbers', gives: 'How many submissions you have, your verified views and the badges you show. Never your earnings.' },
  { id: 'offline_access', label: 'Stay connected', gives: 'Keep working when you are not on the site, until you disconnect it.' },
]
export const SCOPE_IDS = SCOPES.map((s) => s.id) as string[]
