import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import { SeventeenFooter } from '@/components/seventeen/footer'
import { SeventeenHeader } from '@/components/seventeen/header'
import { ToTop } from '@/components/seventeen/to-top'
import { searchIndex } from '@/lib/seventeen/packs'

const DESCRIPTION = 'Clean, watermark-free 4K scenepacks of the films, series and anime people edit most. Free, with new packs every week.'

// 17 has its own name, icons and share picture (public/17, made by scripts/make-seventeen-icons.py), so nothing of the main site shows
export const metadata: Metadata = {
  metadataBase: new URL('https://17.logoless.io'),
  title: { default: '17 | Free 4K scenepacks', template: '%s | 17' },
  description: DESCRIPTION,
  applicationName: '17',
  icons: { icon: [{ url: '/17/icon.svg', type: 'image/svg+xml' }, { url: '/17/icon-32.png', sizes: '32x32', type: 'image/png' }], apple: '/17/apple-icon.png' },
  manifest: '/17/manifest.webmanifest',
  openGraph: { title: '17 | Free 4K scenepacks', description: DESCRIPTION, siteName: '17', type: 'website', images: [{ url: '/17/og.png', width: 1200, height: 630, alt: '17' }] },
  twitter: { card: 'summary_large_image', title: '17 | Free 4K scenepacks', description: DESCRIPTION, images: ['/17/og.png'] },
}

export const viewport: Viewport = { themeColor: '#000000' }

/**
 * 17.logoless.io (see middleware.ts): the scenepack site, a site of its own with none of logoless around it (the root layout renders it bare).
 * The words are Schibsted Grotesk, set here on the whole site (buttons and fields too) so it looks the same whichever look the main site is in.
 */
export default function SeventeenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="s17 s17-grain relative min-h-dvh overflow-x-clip bg-black font-sans text-white antialiased"
      style={{ '--font-body': 'var(--font-f-schibsted)', '--font-ui': 'var(--font-f-schibsted)', '--font-display-face': 'var(--font-f-schibsted)', letterSpacing: '-0.005em' } as CSSProperties}
    >
      <SeventeenHeader items={searchIndex()} />
      <main>{children}</main>
      <SeventeenFooter />
      <ToTop />
    </div>
  )
}
