'use client'

import { ArrowRight, Loader2, Lock } from 'lucide-react'
import { useActionState, useEffect } from 'react'
import { unlockYt } from '@/app/yt/actions'

/** yt.logoless.io before the password: nothing of the plan is sent until it is right (see lib/yt/gate.ts). */
export function YtLock() {
  const [state, action, pending] = useActionState(unlockYt, null)
  const error = state && 'error' in state ? state.error : null
  // the right password: load the page again, now with the cookie (a full load, so the address stays yt.logoless.io/ and not the main site's home)
  useEffect(() => {
    if (state && 'ok' in state) window.location.reload()
  }, [state])
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0c0c10] px-4 text-white">
      <form action={action} className="w-full max-w-sm">
        <div className="mx-auto mb-6 grid size-12 place-items-center rounded-2xl bg-[#E8752A]/15">
          <Lock className="size-5 text-[#E8752A]" />
        </div>
        <h1 className="text-center font-display text-[clamp(2.2rem,9vw,2.8rem)] leading-none text-white">
          Side Effects<span className="text-[#E8752A]">.</span>
        </h1>
        <p className="mt-3 text-center text-[15px] text-white/55">The channel plan is private. Enter the password.</p>
        <label htmlFor="yt-password" className="sr-only">Password</label>
        <div className="mt-7 flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] p-1.5 pl-5 focus-within:border-[#E8752A]/70">
          <input
            id="yt-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            placeholder="Password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'yt-password-error' : undefined}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-white outline-none placeholder:text-white/35"
          />
          <button
            type="submit"
            disabled={pending || Boolean(state && 'ok' in state)}
            aria-label="Unlock"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#E8752A] text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </button>
        </div>
        <p id="yt-password-error" role="alert" className="mt-3 min-h-5 text-center text-[14px] text-[#F08A8A]">{error ?? ''}</p>
      </form>
    </div>
  )
}
