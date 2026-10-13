import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Inter, Inter_Tight } from 'next/font/google'
import { connection } from 'next/server'
import { TextEditor } from '@/components/admin/text-editor'
import { DevBar } from '@/components/dev/dev-bar'
import { DevGate } from '@/components/dev/dev-gate'
import { AppShell } from '@/components/shell/app-shell'
import { CopyProvider } from '@/components/shell/copy-provider'
import { DesignProvider } from '@/components/shell/design-provider'
import { FeaturesProvider } from '@/components/shell/features-provider'
import { getAnnouncement } from '@/lib/announcement'
import { featureState } from '@/lib/features'
import { getOverrides } from '@/lib/copy'
import { getSetting } from '@/lib/settings'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const tight = Inter_Tight({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-display-face', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face' })

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
  const [overrides, session, fs, dots, fx, border, mono] = await Promise.all([getOverrides(), getSession(), featureState(), getSetting('bg_dots'), getSetting('design_cover_effects'), getSetting('design_cover_border'), getSetting('design_font_mono')])
  const isAdmin = session?.user?.role === 'admin'
  // The dev site is for admins only: everyone else gets a sign-in screen and nothing from behind it.
  const blocked = fs.dev && !isAdmin
  const announcement = fs.on.announcement && !blocked ? await getAnnouncement() : null
  return (
    <html lang="en" suppressHydrationWarning data-font={mono === '1' ? 'mono' : undefined} className={`${inter.variable} ${tight.variable} ${geistMono.variable} bg-ink`}>
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_LD) }} />
      </head>
      <body className="antialiased">
        <FeaturesProvider dev={fs.dev} on={fs.on}>
          <DesignProvider value={{ coverEffects: fx === '1', coverBorder: border === '1' }}>
          <CopyProvider overrides={overrides} isAdmin={isAdmin}>
            <AppShell announcement={announcement} dots={dots === '1'}>{blocked ? <DevGate email={session?.user?.email ?? null} /> : children}</AppShell>
            {isAdmin && <TextEditor />}
            {fs.dev && isAdmin && <DevBar />}
          </CopyProvider>
          </DesignProvider>
        </FeaturesProvider>
      </body>
    </html>
  )
}
