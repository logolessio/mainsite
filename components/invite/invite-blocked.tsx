'use client'

import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { Logo } from '@/components/logo'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { STAGE_FONTS } from './fonts'
import { hueFor, MovingGradient, usePointer } from './stage'

const COPY = {
  off: { title: 'This link is switched off.', body: 'If you think that is a mistake, reply to the person who sent it and they will sort it out.' },
  taken: { title: 'This link already belongs to another account.', body: 'You are signed in with a different account than the one that claimed it. Sign out and use the right one.' },
  email: { title: 'This link was made for a different email.', body: 'Sign in with the address it was sent to and it will open straight away.' },
} as const

/** A link that cannot be opened by this person, said in the same voice as the page it would have been. */
export function InviteBlocked({ kind, slug, hint }: { kind: keyof typeof COPY; slug: string; hint?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  const c = COPY[kind]
  const hue = hueFor(slug)
  const pointer = usePointer()
  return (
    <div className={cn('stage-root fixed inset-0 z-[80] grid place-items-center px-5 text-center text-paper', STAGE_FONTS)} style={{ ['--stage-h' as string]: hue }}>
      <MovingGradient hue={hue} pointer={pointer} />
      <div className="relative max-w-xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE_OUT }}>
          <Logo className="mx-auto h-12" />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 1.1, delay: 0.2, ease: EASE_OUT }} className="stage-grot mt-12 text-[clamp(2.2rem,6vw,4.4rem)]">
          {c.title}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5, ease: EASE_OUT }} className="stage-mono-body mx-auto mt-6 max-w-md text-[13px] leading-[1.9] text-white/80">
          {c.body}
        </motion.p>
        {hint && <p className="stage-mono-body mt-3 text-xs text-white/60">Expected: <span className="text-paper">{hint}</span></p>}
        {kind !== 'off' && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }} type="button" onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(`/${slug}`)}` })} className="stage-mono mt-10 border border-white/60 px-5 py-3 text-[11px] transition-colors duration-500 hover:bg-white/10">
            Sign out and try another account
          </motion.button>
        )}
      </div>
    </div>
  )
}
