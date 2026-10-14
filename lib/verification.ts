import { db, nowSec } from './db'
import { discordIdOf } from './discord-bot'

/**
 * Whether we know this account is really theirs. A person is verified when they signed in with Discord, signed up with an
 * email and the code we sent, or entered a code during onboarding or later (that is what `verified:<id>` records).
 */
export async function isVerified(userId: string, email: string): Promise<{ verified: boolean; via: 'discord' | 'email' | 'code' | null }> {
  const d = await db()
  const [mark, cred, discord] = await Promise.all([
    d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`verified:${userId}`).first(),
    d.prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(email.toLowerCase()).first(),
    discordIdOf(userId),
  ])
  if (discord) return { verified: true, via: 'discord' }
  if (cred) return { verified: true, via: 'email' }
  if (mark) return { verified: true, via: 'code' }
  return { verified: false, via: null }
}

export async function markVerified(userId: string) {
  const d = await db()
  await d
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, '1', ?2) ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at")
    .bind(`verified:${userId}`, nowSec())
    .run()
}
