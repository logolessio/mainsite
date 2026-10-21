import { safeEqual } from './crypto'

/** Time-based one-time codes (RFC 6238): the six digits an authenticator app shows, from a secret both sides hold. Web Crypto only, so it runs on Workers. */
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32(bytes: Uint8Array): string {
  let bits = 0
  let v = 0
  let out = ''
  for (const b of bytes) {
    v = (v << 8) | b
    bits += 8
    while (bits >= 5) {
      out += A[(v >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += A[(v << (5 - bits)) & 31]
  return out
}

function unbase32(s: string): Uint8Array {
  const out: number[] = []
  let bits = 0
  let v = 0
  for (const ch of s.toUpperCase().replace(/[^A-Z2-7]/g, '')) {
    v = (v << 5) | A.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((v >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Uint8Array.from(out)
}

export const newSecret = () => base32(crypto.getRandomValues(new Uint8Array(20)))

async function hotp(secret: string, counter: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', unbase32(secret) as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(counter))
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, buf))
  const o = h[19] & 15
  const n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 1_000_000).padStart(6, '0')
}

/** The time step that matched (so it can be refused a second time), or null. One step either side is allowed for clocks that are a little off. */
export async function verifyTotp(secret: string, code: string, after = 0, now = Date.now()): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null
  const step = Math.floor(now / 30000)
  for (const c of [step, step - 1, step + 1]) {
    if (c > after && safeEqual(await hotp(secret, c), code)) return c
  }
  return null
}

export const otpauthUrl = (email: string, secret: string) => `otpauth://totp/logoless:${encodeURIComponent(email)}?secret=${secret}&issuer=logoless&algorithm=SHA1&digits=6&period=30`
