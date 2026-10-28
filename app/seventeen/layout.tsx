import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { SeventeenFooter } from '@/components/seventeen/footer'
import { SeventeenHeader } from '@/components/seventeen/header'
import { ToTop } from '@/components/seventeen/to-top'

export const metadata: Metadata = {
  metadataBase: new URL('https://17.logoless.io'),
  title: { default: '17 | Free 4K scenepacks for editors', template: '%s | 17' },
  description: 'Premium 4K scenepacks for edits, free. Films, series, anime, sport and b-roll, by the logoless team.',
}

export const viewport: Viewport = { themeColor: '#000000' }

/**
 * 17.logoless.io (see middleware.ts): the scenepack site, a site of its own with none of logoless around it (the root layout renders it bare).
 * The words are IBM Plex Mono and the big titles Schibsted Grotesk Black, set here on the whole site so it looks the same whichever look the
 * main site is in. The thin rounded frame round the window is drawn over everything and lets clicks through.
 */
export default function SeventeenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="s17 relative min-h-dvh bg-black font-sans text-white antialiased"
      style={{ '--font-body': 'var(--font-f-ibm-plex-mono)', '--font-display-face': 'var(--font-f-schibsted)', letterSpacing: '-0.01em' } as CSSProperties}
    >
      <div aria-hidden className="pointer-events-none fixed inset-1.5 z-50 hidden rounded-[26px] border border-white/10 shadow-[0_0_0_12px_#000] md:block" />
      <div className="md:px-1.5 md:pt-1.5">
        <SeventeenHeader />
        <main>{children}</main>
        <SeventeenFooter />
      </div>
      <ToTop />
    </div>
  )
}
