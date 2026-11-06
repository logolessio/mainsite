'use client'

import '@/components/editor/editor.css'
import { Menu, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { FOOTER, NAV_LINKS } from '@/lib/site'
import { cn } from '@/lib/utils'

/** The top of the site's own pages (help, about, legal…): home on the left, the pages and the way in on the right, a menu on phones. */
export function SiteHeader({ current }: { current?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <a href="#main" className="cap sr-only bg-white px-4 py-2 text-black focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50">
        skip to the page
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between gap-4 px-5 md:px-8">
        <a href="/" className="cap text-white transition-opacity hover:opacity-70">
          logoless
        </a>
        <nav aria-label="site" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} aria-current={current === l.href ? 'page' : undefined} className={cn('cap inline-flex h-10 items-center px-3 transition-colors', current === l.href ? 'text-white' : 'text-white/55 hover:text-white')}>
              {l.label}
            </a>
          ))}
          <span className="mx-2 h-4 w-px bg-white/15" />
          <a href="/login" className="cap inline-flex h-10 items-center px-3 text-white/55 transition-colors hover:text-white">
            log in
          </a>
          <a href="/signup" className="btn">
            get started
          </a>
        </nav>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Close the menu' : 'Open the menu'} className="grid size-10 place-items-center text-white md:hidden">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav aria-label="site" className="border-t border-white/10 px-5 pt-2 pb-5 md:hidden">
          {[...NAV_LINKS, { label: 'Contact', href: '/contact' }, { label: 'Log in', href: '/login' }].map((l) => (
            <a key={l.href} href={l.href} className="block border-b border-white/10 py-3.5 text-[0.95rem] text-white/80">
              {l.label}
            </a>
          ))}
          <a href="/signup" className="btn btn-solid mt-4 w-full justify-center">
            get started
          </a>
        </nav>
      )}
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 pt-14 pb-10 md:px-8">
      <div className="mx-auto grid w-full max-w-[72rem] grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <a href="/" className="cap text-white">
            logoless
          </a>
          <p className="mt-3 max-w-[14rem] text-[0.78rem] leading-relaxed text-white/45">a link in bio for people who make things move.</p>
        </div>
        {Object.entries(FOOTER).map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="cap text-white/40">{title}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-[0.82rem] text-white/65 transition-colors hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="cap mx-auto mt-14 flex w-full max-w-[72rem] flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-white/35">
        <span>© {new Date().getFullYear()} logoless</span>
        <a href="/preferences" className="hover:text-white">
          motion, music &amp; data on this device
        </a>
      </div>
    </footer>
  )
}

/** A whole page of the site: header, the content, footer. Black and white, the same type as the home page. */
export function SiteFrame({ children, current, wide = false }: { children: ReactNode; current?: string; wide?: boolean }) {
  return (
    <div className="ed min-h-dvh">
      <SiteHeader current={current} />
      <main id="main" className={cn('mx-auto w-full px-5 pt-14 pb-24 md:px-8 md:pt-20', wide ? 'max-w-[72rem]' : 'max-w-[46rem]')}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

/** The small label, big title and lead line every page starts with. */
export function PageHead({ kicker, title, lead }: { kicker: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <div>
      <p className="cap text-white/40">{kicker}</p>
      <h1 className="disp mt-5 text-[clamp(2.4rem,7vw,4.6rem)]">{title}</h1>
      {lead && <p className="mt-6 max-w-[36rem] text-[0.92rem] leading-relaxed text-white/60">{lead}</p>}
    </div>
  )
}
