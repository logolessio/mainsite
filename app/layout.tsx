import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AppShell } from '@/components/shell/app-shell'
import { SITE } from '@/lib/site'
import './globals.css'

const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-body' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono-face' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'logoless — views have value', template: '%s' },
  openGraph: { title: 'logoless — views have value', siteName: 'logoless', type: 'website', images: ['/logo.png'] },
  twitter: { card: 'summary_large_image' },
  description:
    'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} bg-ink`}>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
