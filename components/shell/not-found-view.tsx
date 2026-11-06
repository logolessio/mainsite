'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type State = 'checking' | 'free' | 'taken' | 'plain'

/** A page that does not exist. If the first part of its address is a username nobody has, it says so and offers it; if somebody has it, it points there. */
export function NotFoundView() {
  const path = usePathname() ?? ''
  const name = (() => {
    const first = path.split('/').filter(Boolean)[0] ?? ''
    try {
      return decodeURIComponent(first).toLowerCase().replace(/^@/, '')
    } catch {
      return ''
    }
  })()
  const [state, setState] = useState<State>(name ? 'checking' : 'plain')
  useEffect(() => {
    if (!name) return setState('plain')
    setState('checking')
    const ctl = new AbortController()
    fetch(`/api/bio/check?h=${encodeURIComponent(name)}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { available?: boolean; reason?: string }) => setState(j.available ? 'free' : j.reason === 'taken' ? 'taken' : 'plain'))
      .catch(() => setState('plain'))
    return () => ctl.abort()
  }, [name])

  if (state === 'free' || state === 'taken') {
    return (
      <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
        <div className="rise w-full max-w-[34rem]">
          <p className="text-[0.82rem] text-white/50">{state === 'free' ? 'This username is untaken' : 'This username is taken'}</p>
          <div className="mx-auto mt-6 flex w-full max-w-[26rem] flex-col items-center rounded-[28px] border border-white/10 bg-[#0d0d0d] px-6 py-12 shadow-[var(--ed-lift)]">
            <p className="text-[0.84rem] text-white/45">logoless.io/</p>
            <h1 className="disp mt-1 text-[clamp(2.4rem,10vw,4.2rem)] break-all">{name}</h1>
          </div>
          <p className="mx-auto mt-8 max-w-[24rem] text-[0.86rem] leading-[1.75] text-white/60">{state === 'free' ? "Nobody has this one yet. Claim it and it's yours, for free." : 'Somebody has this one. The page you were after may be theirs.'}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {state === 'free' ? (
              <a href={`/signup?claim=${encodeURIComponent(name)}`} className="btn btn-solid">
                Claim it
              </a>
            ) : (
              <a href={`/${encodeURIComponent(name)}`} className="btn btn-solid">
                Open it
              </a>
            )}
            <a href="/" className="btn">
              What&apos;s this?
            </a>
          </div>
        </div>
      </main>
    )
  }
  return (
    <main className="ed fixed inset-0 z-40 grid place-items-center overflow-y-auto px-6 text-center">
      <div className="rise max-w-md">
        <p className="disp text-[clamp(4rem,14vw,8rem)]">404</p>
        <h1 className="mt-4 text-[1.05rem] font-medium">That page doesn&apos;t exist</h1>
        <p className="mt-3 text-[0.86rem] leading-[1.7] text-white/55">The link might be old or mistyped.</p>
        <div className="mt-8 flex justify-center">
          <a href="/" className="btn btn-solid">
            Go home
          </a>
        </div>
      </div>
    </main>
  )
}
