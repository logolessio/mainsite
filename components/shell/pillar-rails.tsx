'use client'

import { usePathname } from 'next/navigation'
import { Pillar } from '@/components/marketing/pillar'

/** Pages with a sidebar of their own (the dashboards) have their own edges: no pillars there. */
export const inAppPath = (path: string) => /^\/(dashboard|brand|admin|owner|dev)(\/|$)/.test(path)

/** The two white pillars at the edges of the page column (wide screens, on the Anubis look: see .gf-rails in globals.css). */
export function PillarRails() {
  return (
    <span className="gf-rails">
      <Pillar />
      <Pillar />
    </span>
  )
}

/**
 * The pillars as a layer of their own, for the site's shell: the page's soft edge shading (LightField) sits above the moving background, so pillars drawn inside the
 * background would be shaded away at the very edges where they stand. This layer comes after it, still behind the page.
 */
export function PageRails() {
  const path = usePathname() ?? ''
  if (inAppPath(path)) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <PillarRails />
    </div>
  )
}
