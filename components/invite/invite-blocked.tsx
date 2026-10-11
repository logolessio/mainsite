'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'
import { Logo } from '@/components/logo'

const COPY = {
  off: { title: 'This link is switched off.', body: 'If you think that is a mistake, reply to the person who sent it and they will sort it out.' },
  taken: { title: 'This link already belongs to another account.', body: 'You are signed in with a different account than the one that claimed it. Sign out and use the right one, or ask the person who sent it to hand it back.' },
  email: { title: 'This link was made for a different email.', body: 'Sign in with the address it was sent to and it will open straight away.' },
} as const

export function InviteBlocked({ kind, slug, hint }: { kind: keyof typeof COPY; slug: string; hint?: string }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  const c = COPY[kind]
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink px-5 text-center text-paper">
      <div className="max-w-md">
        <Logo className="mx-auto h-12" />
        <h1 className="mt-10 font-display text-4xl font-medium tracking-tight">{c.title}</h1>
        <p className="mt-4 leading-relaxed text-mute">{c.body}</p>
        {hint && <p className="mt-3 text-sm text-mute">Expected: <span className="text-paper">{hint}</span></p>}
        {kind !== 'off' && (
          <button type="button" onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(`/${slug}`)}` })} className="mt-8 inline-flex h-12 items-center rounded-full bg-paper px-7 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
            Sign out and try another account
          </button>
        )}
      </div>
    </div>
  )
}
