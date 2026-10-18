'use client'

import { ArrowUpRight, ShieldAlert } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'

/** The "you are leaving logoless" page. Nothing opens until the person presses the button. */
export function ExternalNotice({ url }: { url: string | null }) {
  if (!url) {
    return (
      <>
        <h1 className="font-display text-5xl">That link has expired</h1>
        <p className="mt-4 text-mute">We could not confirm where this link goes, so we did not open it.</p>
        <TransitionLink href="/" className="mt-8 inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink">
          Back to logoless
        </TransitionLink>
      </>
    )
  }
  const u = new URL(url)
  return (
    <>
      <ShieldAlert className="size-10 text-mute" aria-hidden="true" />
      <h1 className="mt-6 font-display text-5xl">You are leaving logoless</h1>
      <p className="mt-4 text-mute">
        This link was added by a member. It is not an official logoless link and we have not checked it. Do not enter your password or payment details unless you are sure the site is genuine.
      </p>
      <div className="mt-8 w-full rounded-[calc(22px*var(--round,1))] border border-line-strong bg-surface p-4 text-left">
        <p className="text-xs text-mute">You are about to visit</p>
        <p className="mt-1 font-mono text-sm break-all">
          <span className="text-paper">{u.hostname}</span>
          <span className="text-mute">{u.pathname + u.search}</span>
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.assign(url)}
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink  transition-opacity hover:bg-paper/85"
        >
          I understand <ArrowUpRight className="size-4" />
        </button>
        <button type="button" onClick={() => window.history.back()} className="inline-flex h-11 items-center rounded-pill border border-line-strong px-6 text-sm hover:bg-paper/10">
          Go back
        </button>
      </div>
      <TransitionLink href="/legal/external-links" className="mt-8 text-xs text-mute underline underline-offset-2 hover:text-paper">
        Read about external links
      </TransitionLink>
    </>
  )
}
