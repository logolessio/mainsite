import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { connection } from 'next/server'
import { TextEditor } from '@/components/admin/text-editor'
import { AppShell } from '@/components/shell/app-shell'
import { CopyProvider } from '@/components/shell/copy-provider'
import { getOverrides } from '@/lib/copy'
import { setting } from '@/lib/db'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'
import './globals.css'

const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-body' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face' })

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'logoless — views have value', template: '%s' },
  openGraph: { title: 'logoless — views have value', siteName: 'logoless', type: 'website', images: ['/logo.png'] },
  twitter: { card: 'summary_large_image' },
  description:
    'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
}

export async function generateMetadata(): Promise<Metadata> {
  return (await setting('SITE_ENV')) === 'dev' ? { ...baseMetadata, robots: { index: false, follow: false } } : baseMetadata
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Site text can be edited by the owner, so every page is built per request with the current wording.
  await connection()
  const [overrides, session] = await Promise.all([getOverrides(), getSession()])
  const isAdmin = session?.user?.role === 'admin'
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} bg-ink`}>
      <body className="antialiased">
        <CopyProvider overrides={overrides} isAdmin={isAdmin}>
          <AppShell>{children}</AppShell>
          {isAdmin && <TextEditor />}
        </CopyProvider>
      </body>
    </html>
  )
}
