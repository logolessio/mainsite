'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Lock, Megaphone, ShieldCheck, Users, Wallet } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Logo } from '@/components/logo'
import { EASE_OUT } from '@/lib/layout'
import { Confetti } from './bits'

type Props = {
  name: string
  slug: string
  /** signedOut: nobody is signed in. unclaimed: signed in, link not claimed yet. */
  state: 'signedOut' | 'unclaimed'
  email?: string
  lockedTo?: string | null
  admin?: boolean
}

/** The first thing an invited artist sees: their name, big, and one clear button. */
export function InviteWelcome({ name, slug, state, email, lockedTo, admin }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  const next = encodeURIComponent(`/${slug}`)
  const words = `Hey ${name}.`.split(' ')

  const claim = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/invite/${slug}/claim`, { method: 'POST' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    if (!res?.ok) {
      setBusy(false)
      return setError(j.error ?? 'Something went wrong. Please try again.')
    }
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-ink text-paper">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-1/3 left-1/2 size-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(243_242_238/0.22),transparent)] blur-3xl" animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.08)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      </div>
      <Confetti count={26} />

      <div className="relative mx-auto flex min-h-full max-w-3xl flex-col items-center px-5 py-10 text-center">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }}>
          <Logo className="h-11 md:h-14" />
        </motion.div>

        <div className="my-auto w-full py-12">
          {admin && (
            <p className="mx-auto mb-8 inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs text-amber-200">
              Admin preview: this is what {name} sees. Admins cannot claim a link.
            </p>
          )}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="mb-5 font-mono text-xs tracking-[0.2em] text-mute uppercase">
            A private page, made for you
          </motion.p>
          <h1 className="font-display text-[3.2rem] leading-[0.98] font-medium tracking-tight md:text-8xl">
            {words.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top">
                <motion.span initial={{ y: '115%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.25 + i * 0.1, ease: EASE_OUT }} className="inline-block">
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-mute md:text-xl">
            Set up your artist page, launch a campaign and let clippers turn your music into views. It takes about five minutes.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.9, ease: EASE_OUT }} className="mt-10 flex flex-col items-center gap-3">
            {state === 'signedOut' ? (
              <>
                <a href={`/signup?next=${next}`} className="inline-flex h-14 items-center gap-2 rounded-full bg-paper px-9 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95">
                  Create my account <ArrowRight className="size-5" />
                </a>
                <a href={`/login?next=${next}`} className="text-sm text-mute underline underline-offset-4 transition-colors hover:text-paper">
                  I already have an account
                </a>
              </>
            ) : admin ? (
              <a href="/admin/invites" className="inline-flex h-14 items-center gap-2 rounded-full border border-line-strong px-9 text-base transition-colors hover:bg-white/10">
                Back to artist links
              </a>
            ) : (
              <>
                <button type="button" onClick={claim} disabled={busy} className="inline-flex h-14 items-center gap-2 rounded-full bg-paper px-9 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-60">
                  {busy ? <Loader2 className="size-5 animate-spin" /> : null} Yes, this is me <ArrowRight className="size-5" />
                </button>
                <p className="text-sm text-mute">
                  Signed in as <span className="text-paper">{email}</span>.{' '}
                  <button type="button" onClick={() => signOut({ callbackUrl: `/login?next=${next}` })} className="underline underline-offset-4 hover:text-paper">
                    Not you?
                  </button>
                </p>
              </>
            )}
            {lockedTo && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-mute">
                <Lock className="size-3.5" /> Use the email this link was sent to ({lockedTo})
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-signal">
                {error}
              </p>
            )}
          </motion.div>
        </div>

        <motion.ul initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.1, ease: EASE_OUT }} className="grid w-full gap-3 sm:grid-cols-4">
          {[
            [Users, 'Your artist page'],
            [Megaphone, 'Launch a campaign'],
            [Wallet, 'Fund and top up'],
            [ShieldCheck, 'Pay only for verified views'],
          ].map(([Ic, t]) => {
            const I = Ic as typeof Users
            return (
              <li key={t as string} className="flex flex-col items-center gap-2 rounded-3xl border border-line bg-white/[0.03] px-4 py-5 text-sm text-mute">
                <I className="size-5 text-paper" />
                {t as string}
              </li>
            )
          })}
        </motion.ul>
      </div>
    </div>
  )
}
