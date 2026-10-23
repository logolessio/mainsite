import { signIn } from 'next-auth/react'

/** What the settings card shows for each passkey. */
export type PasskeyView = { id: string; name: string; at: number; last: number | null; synced: boolean }

/** The person closed the Face ID or fingerprint prompt, or it timed out. Not an error worth showing. */
export class PasskeyCancelled extends Error {}

const enc = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const dec = (s: string): ArrayBuffer => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer
}

/** Whether this browser can do passkeys at all. */
export const passkeysSupported = () => typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' && Boolean(navigator.credentials)

async function post<T>(path: string, data: unknown): Promise<{ res: Response; json: T & { error?: string } }> {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  return { res, json: (await res.json().catch(() => ({}))) as T & { error?: string } }
}

const asCancel = (e: unknown) => {
  if (e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return new PasskeyCancelled()
  return e
}

/** "Passkey on Safari, Mac": a name a person will recognise in a list. */
export function passkeyName() {
  const ua = navigator.userAgent
  const browser = /edg\//i.test(ua) ? 'Edge' : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'this browser'
  const device = /iphone/i.test(ua) ? 'iPhone' : /ipad/i.test(ua) ? 'iPad' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'Mac' : /linux|cros/i.test(ua) ? 'Linux' : 'a device'
  return `${browser} on ${device}`
}

/** Adds a passkey to the signed-in account: the device asks for Face ID, a fingerprint or its PIN, and logoless keeps the public key. */
export async function addPasskey(name = passkeyName()): Promise<PasskeyView[]> {
  const first = await post<Record<string, unknown> & { challenge: string; user: { id: string }; excludeCredentials?: { id: string }[] }>('/api/me/passkeys', { action: 'options' })
  if (!first.res.ok) throw new Error(first.json.error ?? 'We could not start that. Please try again.')
  const o = first.json
  let cred: PublicKeyCredential | null
  try {
    cred = (await navigator.credentials.create({
      publicKey: { ...(o as object), challenge: dec(o.challenge), user: { ...(o.user as object), id: dec(o.user.id) }, excludeCredentials: (o.excludeCredentials ?? []).map((c) => ({ ...c, type: 'public-key' as const, id: dec(c.id) })) } as PublicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null
  } catch (e) {
    throw asCancel(e)
  }
  if (!cred) throw new PasskeyCancelled()
  const att = cred.response as AuthenticatorAttestationResponse
  const response = {
    id: cred.id,
    rawId: enc(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: { clientDataJSON: enc(att.clientDataJSON), attestationObject: enc(att.attestationObject), transports: att.getTransports?.() ?? [] },
  }
  const done = await post<{ passkeys: PasskeyView[] }>('/api/me/passkeys', { action: 'verify', response, name })
  if (!done.res.ok) throw new Error(done.json.error ?? 'That passkey could not be saved. Please try again.')
  return done.json.passkeys
}

export async function removePasskey(id: string): Promise<PasskeyView[]> {
  const r = await post<{ passkeys: PasskeyView[] }>('/api/me/passkeys', { action: 'remove', id })
  if (!r.res.ok) throw new Error(r.json.error ?? 'That did not work.')
  return r.json.passkeys
}

/** Logs in with a passkey: the device shows the saved ones for logoless, the person picks and unlocks one, and the site checks the answer. */
export async function signInWithPasskey(): Promise<void> {
  const first = await post<{ challenge: string }>('/api/auth/passkey', { action: 'options' })
  if (!first.res.ok) throw new Error(first.json.error ?? 'We could not start that. Please try again.')
  let cred: PublicKeyCredential | null
  try {
    cred = (await navigator.credentials.get({ publicKey: { ...(first.json as object), challenge: dec(first.json.challenge), allowCredentials: [] } as PublicKeyCredentialRequestOptions })) as PublicKeyCredential | null
  } catch (e) {
    throw asCancel(e)
  }
  if (!cred) throw new PasskeyCancelled()
  const a = cred.response as AuthenticatorAssertionResponse
  const response = {
    id: cred.id,
    rawId: enc(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    clientExtensionResults: cred.getClientExtensionResults(),
    response: { clientDataJSON: enc(a.clientDataJSON), authenticatorData: enc(a.authenticatorData), signature: enc(a.signature), userHandle: a.userHandle ? enc(a.userHandle) : undefined },
  }
  const r = await signIn('passkey', { response: JSON.stringify(response), redirect: false })
  if (!r || r.error || r.ok === false) throw new Error('That passkey did not work here. If you removed it, use another way to log in.')
}
