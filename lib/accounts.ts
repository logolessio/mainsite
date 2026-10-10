// UI-only stubs for linking social accounts with a code in the bio. Replace each body with your backend.
//
// Intended server behaviour:
//   requestVerification  -> create a single-use code bound to (user, platform, handle), expiring in CODE_TTL_MIN minutes.
//   checkVerification    -> fetch the PUBLIC bio / channel description for that handle (platform API or scraper) and look for the
//                           code. On a match, mark the account verified, store the platform's account id, and reject the handle
//                           if it is already linked to a different user.
export type SocialPlatform = 'tiktok' | 'instagram' | 'youtube'

export const CODE_TTL_MIN = 15

export type VerificationRequest = { code: string; expiresAt: number }
export type VerificationResult = 'verified' | 'not_found' | 'expired' | 'taken'

export const BIO_WHERE: Record<SocialPlatform, { place: string; steps: string }> = {
  tiktok: { place: 'bio', steps: 'Profile → Edit profile → Bio' },
  instagram: { place: 'bio', steps: 'Profile → Edit profile → Bio' },
  youtube: { place: 'channel description', steps: 'YouTube Studio → Customization → Basic info → Description' },
}

const attempts = new Map<string, number>()

export async function requestVerification(_platform: SocialPlatform, _handle: string): Promise<VerificationRequest> {
  // TODO(backend): POST /api/accounts/verify/start { platform, handle }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid typos
  const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  await new Promise((r) => setTimeout(r, 500))
  return { code: `logoless-${code}`, expiresAt: Date.now() + CODE_TTL_MIN * 60_000 }
}

export async function checkVerification(platform: SocialPlatform, handle: string, req: VerificationRequest): Promise<VerificationResult> {
  // TODO(backend): POST /api/accounts/verify/check { platform, handle, code }
  await new Promise((r) => setTimeout(r, 1100))
  if (Date.now() > req.expiresAt) return 'expired'
  // Preview behaviour so both states can be seen: the first check fails, the second succeeds.
  const key = `${platform}:${handle}:${req.code}`
  const n = (attempts.get(key) ?? 0) + 1
  attempts.set(key, n)
  return n >= 2 ? 'verified' : 'not_found'
}
