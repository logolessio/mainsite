import type { Metadata, Viewport } from 'next'
import { DM_Sans, Fraunces, Geist, Geist_Mono, IBM_Plex_Mono, Inter, Inter_Tight, Instrument_Serif, JetBrains_Mono, Manrope, Outfit, Playfair_Display, Plus_Jakarta_Sans, Sora, Space_Grotesk, Space_Mono } from 'next/font/google'
import { connection } from 'next/server'
import { SecretDialogHost } from '@/components/admin/secret-dialog'
import { SiteCheckHost } from '@/components/admin/site-check-host'
import { TextEditor } from '@/components/admin/text-editor'
import { DevBar } from '@/components/dev/dev-bar'
import { DevGate } from '@/components/dev/dev-gate'
import { AppShell } from '@/components/shell/app-shell'
import { AutoCopy } from '@/components/shell/auto-copy'
import { CopyProvider } from '@/components/shell/copy-provider'
import { DesignProvider } from '@/components/shell/design-provider'
import { FeaturesProvider } from '@/components/shell/features-provider'
import { getAnnouncement } from '@/lib/announcement'
import { featureState } from '@/lib/features'
import { effectiveFont, fontById } from '@/lib/fonts'
import { getOverrides } from '@/lib/copy'
import { allSettings } from '@/lib/settings'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

// Every typeface the dev dashboard can switch the site to. Only the one in use is downloaded: the others are declared but not preloaded.
const inter = Inter({ subsets: ['latin'], variable: '--font-f-inter', display: 'swap' })
const tight = Inter_Tight({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-f-inter-tight', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face' })
const geist = Geist({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-geist' })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-dm-sans' })
const manrope = Manrope({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-manrope' })
const sora = Sora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-sora' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-space-grotesk' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-plus-jakarta' })
const outfit = Outfit({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-outfit' })
const instrument = Instrument_Serif({ subsets: ['latin'], display: 'swap', preload: false, weight: '400', variable: '--font-f-instrument-serif' })
const fraunces = Fraunces({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-fraunces' })
const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-playfair' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-f-jetbrains-mono' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '600'], variable: '--font-f-ibm-plex-mono' })
const spaceMono = Space_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '700'], variable: '--font-f-space-mono' })
const FONT_CLASSES = [inter, tight, geistMono, geist, dmSans, manrope, sora, spaceGrotesk, jakarta, outfit, instrument, fraunces, playfair, jetbrains, plexMono, spaceMono].map((f) => f.variable).join(' ')

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'logoless | views have value', template: '%s' },
  openGraph: { title: 'logoless | views have value', siteName: 'logoless', type: 'website', images: ['/logo.png'] },
  twitter: { card: 'summary_large_image' },
  description:
    'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
}

export async function generateMetadata(): Promise<Metadata> {
  const fs = await featureState()
  return fs.dev ? { ...baseMetadata, robots: { index: false, follow: false } } : baseMetadata
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

/** What search engines are told about the site itself. Page-specific data (breadcrumbs, FAQs) is added on those pages. */
const SITE_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/logo.png`, email: SITE.emails.support },
    { '@type': 'WebSite', '@id': `${SITE.url}/#site`, name: SITE.name, url: SITE.url, publisher: { '@id': `${SITE.url}/#org` } },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Site text can be edited by the owner, so every page is built per request with the current wording.
  await connection()
  const [overrides, session, fs, design] = await Promise.all([getOverrides(), getSession(), featureState(), allSettings()])
  const font = fontById(effectiveFont(design.design_font, design.design_font_mono))
  const isAdmin = session?.user?.role === 'admin'
  const isDev = session?.user?.roles?.includes('dev') === true
  // The dev site is for the team (admins and developers): everyone else gets a sign-in screen and nothing from behind it.
  const blocked = fs.dev && !isAdmin && !isDev
  const announcement = fs.on.announcement && !blocked ? await getAnnouncement() : null
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-font={font.id === 'inter' ? undefined : font.id}
      data-kind={font.id === 'inter' ? undefined : font.kind}
      style={{ '--font-body': `var(${font.body})`, '--font-display-face': `var(${font.display})` } as React.CSSProperties}
      className={`${FONT_CLASSES} bg-ink`}
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
      </head>
      <body className="antialiased">
        <FeaturesProvider dev={fs.dev} on={fs.on}>
          <DesignProvider value={{ coverZoom: design.design_cover_zoom === '1', coverBorder: design.design_cover_border === '1', coverBar: design.design_cover_bar === '1', coverInfo: design.design_cover_info === '1', scrollEffects: design.design_scroll_effects === '1', liquidLoader: design.design_liquid_loader === '1' }}>
          <CopyProvider overrides={overrides} isAdmin={isAdmin}>
            <AppShell announcement={announcement} dots={design.bg_dots === '1'}>{blocked ? <DevGate email={session?.user?.email ?? null} /> : children}</AppShell>
            <AutoCopy />
            {isAdmin && <TextEditor />}
            {isAdmin && <SecretDialogHost />}
            {(isAdmin || isDev) && <SiteCheckHost />}
            {fs.dev && (isAdmin || isDev) && <DevBar />}
          </CopyProvider>
          </DesignProvider>
        </FeaturesProvider>
      </body>
    </html>
  )
}
