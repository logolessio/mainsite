import Link from 'next/link'
import { SITE } from '@/lib/site'

export type Crumb = { name: string; href?: string }

/** A small trail at the top of inner pages, with the same trail written out for search engines. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const all: Crumb[] = [{ name: 'Home', href: '/' }, ...trail]
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.href ? { item: `${SITE.url}${c.href === '/' ? '' : c.href}` } : {}) })),
  }
  return (
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-[1400px] px-5 pt-28 md:px-10 md:pt-32">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-paper/50">
        {all.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="transition-colors hover:text-paper">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-paper/80">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </nav>
  )
}

/** Plain links to the next things worth reading, so no page is a dead end. */
export function Related({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav aria-label="Keep reading" className="mx-auto w-full max-w-[1400px] px-5 pb-16 md:px-10">
      <p className="text-sm text-paper/50">Keep reading</p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-lg">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="underline underline-offset-4 transition-colors hover:text-paper/70">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
