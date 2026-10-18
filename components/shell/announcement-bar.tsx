'use client'

import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isInvitePath } from '@/lib/invite-shared'
import { useFeature } from './features-provider'
import { TransitionLink } from './transition-link'

const key = (t: string) => `ann:${t.length}:${[...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)}`
const HIDDEN = ['/dashboard', '/brand', '/admin', '/onboarding', '/@', '/u/']

/** A glass message pill floating at the bottom of the public site. Dismissing it is remembered for that exact message. */
export function AnnouncementBar({ text, href }: { text: string; href: string }) {
  const on = useFeature('announcement')
  const pathname = usePathname()
  const [gone, setGone] = useState(true)
  useEffect(() => {
    try {
      setGone(localStorage.getItem(key(text)) === '1')
    } catch {
      setGone(false)
    }
  }, [text])
  if (!on || gone || HIDDEN.some((p) => pathname.startsWith(p)) || isInvitePath(pathname)) return null
  const inner = <span className="min-w-0 truncate">{text}</span>
  const cls = 'flex min-w-0 items-center gap-2 pl-5 text-sm hover:text-paper'
  return (
    <div role="region" aria-label="Announcement" className="pointer-events-none fixed inset-x-0 bottom-[5.25rem] z-[65] flex justify-center px-4 lg:bottom-5">
      <div className="glass-liquid pointer-events-auto flex h-12 max-w-[min(38rem,100%)] items-center gap-1 rounded-pill pr-2 backdrop-blur-xl">
        {href ? (
          href.startsWith('/') ? (
            <TransitionLink href={href} className={cls}>{inner}<span aria-hidden="true">→</span></TransitionLink>
          ) : (
            <a href={href} className={cls}>{inner}<span aria-hidden="true">→</span></a>
          )
        ) : (
          <span className={cls}>{inner}</span>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try {
              localStorage.setItem(key(text), '1')
            } catch {
              /* fine */
            }
            setGone(true)
          }}
          className="ml-2 grid size-8 shrink-0 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
