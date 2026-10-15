// Discord signs every request it sends to our interactions address. We check that signature before doing anything.

const bytes = (hex: string) => {
  const m = hex.match(/.{2}/g)
  if (!m || m.length * 2 !== hex.length || !/^[0-9a-fA-F]+$/.test(hex)) return null
  return Uint8Array.from(m.map((b) => parseInt(b, 16)))
}

export async function verifyDiscordRequest(publicKeyHex: string, signatureHex: string, timestamp: string, rawBody: string): Promise<boolean> {
  const key = bytes(publicKeyHex)
  const sig = bytes(signatureHex)
  if (!key || !sig || !timestamp) return false
  const data = new TextEncoder().encode(timestamp + rawBody)
  for (const alg of [{ name: 'Ed25519' }, { name: 'NODE-ED25519', namedCurve: 'NODE-ED25519' }] as const) {
    try {
      const k = await crypto.subtle.importKey('raw', key, alg as never, false, ['verify'])
      return await crypto.subtle.verify(alg as never, k, sig, data)
    } catch {
      /* try the other name for the same algorithm */
    }
  }
  return false
}
