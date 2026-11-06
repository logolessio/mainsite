'use client'

import { cn } from '@/lib/utils'
import { useBio } from './context'

/** The menu of a site with more than one page: Home and each page, in a small bar at the top. In the editor, pressing one switches the page being edited. */
export function SiteNav({ onSite }: { onSite?: (slug: string) => void }) {
  const { data, cfg, mode } = useBio()
  const pages = cfg.pages ?? []
  if (!pages.length || mode === 'mini') return null
  const current = data.current ?? ''
  const items = [{ slug: '', title: 'Home' }, ...pages.map((p) => ({ slug: p.slug, title: p.title }))]
  return (
    <nav aria-label="Pages" className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3">
      <ul className="pointer-events-auto flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-[var(--bio-line)] bg-[color-mix(in_srgb,var(--bio-bg)_78%,transparent)] p-1 text-[0.8rem] shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)]">
        {items.map((it) => {
          const on = it.slug === current
          return (
            <li key={it.slug || 'home'}>
              <a
                href={`/${data.handle}${it.slug ? `/${it.slug}` : ''}`}
                aria-current={on ? 'page' : undefined}
                onClick={(e) => {
                  if (mode === 'live') return
                  e.preventDefault()
                  onSite?.(it.slug)
                }}
                className={cn('inline-flex h-8 items-center rounded-full px-3.5 whitespace-nowrap transition-colors duration-200', on ? 'bg-[var(--bio-fg)] text-[var(--bio-bg)]' : 'text-[var(--bio-mute)] hover:text-[var(--bio-fg)]')}
              >
                {it.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
