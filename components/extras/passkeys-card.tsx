'use client'

import { FingerprintPattern, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { addPasskey, passkeysSupported, PasskeyCancelled, type PasskeyView, removePasskey } from '@/lib/passkey-client'
import { agoText } from '@/lib/time-ago'
import { toast } from '@/lib/toast'

type State = { supported: boolean; passkeys: PasskeyView[] }

const day = (s: number) => new Date(s * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Passkeys, in Settings: log in with Face ID, a fingerprint, the device PIN or a security key. Add one on this device (the browser asks for the face or finger),
 * see the ones saved, and remove any. logoless keeps only the public half of each key.
 */
export function PasskeysCard() {
  const on = useFeature('passkeys')
  const [st, setSt] = useState<State | null>(null)
  const [here, setHere] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!on) return
    setHere(passkeysSupported())
    fetch('/api/me/passkeys', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setSt(j))
      .catch(() => {})
  }, [on])
  if (!on || !st) return null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      if (!(e instanceof PasskeyCancelled)) setError(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }
  const can = st.supported && here

  return (
    <section id="passkeys" className="rounded-card border border-line bg-black/45 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-white/[0.07]">
          <FingerprintPattern aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-normal">Passkeys</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">Log in with Face ID, a fingerprint or your device PIN instead of a password. Nothing to type, nothing to remember, and nobody can trick you into giving it away. logoless only keeps the public half of the key.</p>

          {st.passkeys.length > 0 && (
            <ul className="mt-5 grid gap-2">
              {st.passkeys.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-panel border border-line bg-black/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {p.name}
                      {p.synced && <span className="ml-2 rounded-pill border border-line-strong px-2 py-0.5 align-middle text-[11px] text-mute">Synced</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-mute">
                      Added {day(p.at)} · {p.last ? `last used ${agoText(p.last)}` : 'not used yet'}
                    </p>
                  </div>
                  {confirm === p.id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const list = await removePasskey(p.id)
                            setSt({ ...st, passkeys: list })
                            setConfirm(null)
                            toast.ok('Passkey removed')
                          })
                        }
                        className="h-9 rounded-pill bg-signal px-4 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Remove it
                      </button>
                      <button type="button" onClick={() => setConfirm(null)} className="h-9 rounded-pill border border-line-strong px-3 text-sm">
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setConfirm(p.id)} aria-label={`Remove ${p.name}`} className="grid size-9 shrink-0 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            {error && (
              <p role="alert" className="mb-3 text-sm text-signal">
                {error}
              </p>
            )}
            {can ? (
              <button
                type="button"
                disabled={busy || st.passkeys.length >= 10}
                onClick={() =>
                  void run(async () => {
                    const list = await addPasskey()
                    setSt({ ...st, passkeys: list })
                    toast.ok('Passkey added. You can use it to log in from now on.')
                  })
                }
                className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50"
              >
                {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} {st.passkeys.length ? 'Add another passkey' : 'Add a passkey'}
              </button>
            ) : (
              <p className="text-sm text-mute">{st.supported ? 'This browser cannot make passkeys. Try Safari, Chrome, Edge or Firefox on a device with Face ID, a fingerprint reader or a PIN.' : 'Passkeys can only be added on logoless.io. Open the site there and come back to this page.'}</p>
            )}
            {st.passkeys.length > 0 && <p className="mt-3 text-xs text-mute">Keep another way to log in as well, such as your password or Google, in case you lose the device.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
