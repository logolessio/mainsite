import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { connection } from 'next/server'
import { TextEditor } from '@/components/admin/text-editor'
import { DevBar } from '@/components/dev/dev-bar'
import { DevGate } from '@/components/dev/dev-gate'
import { AppShell } from '@/components/shell/app-shell'
import { CopyProvider } from '@/components/shell/copy-provider'
import { FeaturesProvider } from '@/components/shell/features-provider'
import { getAnnouncement } from '@/lib/announcement'
import { featureState } from '@/lib/features'
import { THEME_BOOT } from '@/lib/theme'
import { getOverrides } from '@/lib/copy'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-body' })
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Site text can be edited by the owner, so every page is built per request with the current wording.
  await connection()
  const [overrides, session, fs] = await Promise.all([getOverrides(), getSession(), featureState()])
  const isAdmin = session?.user?.role === 'admin'
  // The dev site is for admins only: everyone else gets a sign-in screen and nothing from behind it.
  const blocked = fs.dev && !isAdmin
  const announcement = fs.on.announcement && !blocked ? await getAnnouncement() : null
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} bg-ink${fs.on['sharp-corners'] ? ' sharp' : ''}`}>
      {fs.on['light-mode'] && !blocked && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        </head>
      )}
      <body className="antialiased">
        <FeaturesProvider dev={fs.dev} on={fs.on}>
          <CopyProvider overrides={overrides} isAdmin={isAdmin}>
            <AppShell announcement={announcement}>{blocked ? <DevGate email={session?.user?.email ?? null} /> : children}</AppShell>
            {isAdmin && <TextEditor />}
            {fs.dev && isAdmin && <DevBar />}
          </CopyProvider>
        </FeaturesProvider>
      </body>
    </html>
  )
}
