// Small Web Crypto helpers. Work on Cloudflare Workers and in Node.

const enc = new TextEncoder()
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function sha256Hex(input: string) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(input)))
}

export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(message)))
}

/** Compares two strings without leaking, through timing, how many leading characters matched. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function randomToken(bytes = 16) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer as ArrayBuffer)
}
