'use client'

import { ArrowUpRight, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Resources', href: '/resources' },
  { label: 'Request', href: '/request' },
  { label: 'logoless', href: SEVENTEEN_LINKS.main, external: true },
]

/** The bar along the top of 17: the mark on the left, the pages in the middle, the Discord on the right. It darkens once the page moves. */
export function SeventeenHeader() {
  const path = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [path])
  // the address the visitor sees is /p/<slug>; inside the code it is /seventeen/p/<slug>
  const here = (href: string) => path === href || path === `/seventeen${href === '/' ? '' : href}`

  return (
    <header className={cn('sticky top-0 z-40 transition-colors duration-300', scrolled || open ? 'bg-black/85 backdrop-blur-xl' : 'bg-transparent')}>
      <div className="mx-auto flex h-14 max-w-[1300px] items-center justify-between px-5 md:px-9">
        <Link href="/" aria-label="17 by logoless, home" className="flex items-center gap-2.5">
          <span className="font-display text-[26px] font-black leading-none tracking-[-0.06em] text-white">17</span>
          <span className="h-4 w-px bg-white/20" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="" width={542} height={117} className="h-[15px] w-auto" />
        </Link>
        <nav aria-label="17" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {NAV.map((n) =>
            n.external ? (
              <a key={n.href} href={n.href} className="inline-flex items-center gap-0.5 text-[13px] text-white/65 transition-colors hover:text-white">
                {n.label}
                <ArrowUpRight className="size-3" />
              </a>
            ) : (
              <Link key={n.href} href={n.href} className={cn('text-[13px] transition-colors hover:text-white', here(n.href) ? 'text-white' : 'text-white/65')}>
                {n.label}
              </Link>
            ),
          )}
        </nav>
        <div className="flex items-center gap-2">
          <a href={SEVENTEEN_LINKS.discord} className="inline-flex h-[37px] items-center gap-2 rounded-full bg-white px-5 text-[13px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
            <BrandIcon name="discord" className="size-4" />
            Discord
          </a>
          <button type="button" aria-label={open ? 'Close the menu' : 'Open the menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-[37px] place-items-center rounded-full border border-white/12 text-white/80 md:hidden">
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="17 menu" className="border-t border-white/8 px-5 pb-5 pt-2 md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className={cn('flex items-center justify-between border-b border-white/6 py-3.5 text-[15px]', !n.external && here(n.href) ? 'text-white' : 'text-white/70')}>
              {n.label}
              {n.external && <ArrowUpRight className="size-4" />}
            </a>
          ))}
        </nav>
      )}
    </header>
  )
}
