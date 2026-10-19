import type { Metadata, Viewport } from 'next'
import { BOOT_GUARD } from '@/components/trailers/boot-guard'

// This is scroll.logoless.io (middleware.ts serves it at the address's root). It is a site of its own, so it has no feature flag and no launch page.
export const metadata: Metadata = {
  title: 'scroll | logoless',
  description: 'Scroll through movie trailers, like what you love and see where to watch it.',
  robots: { index: false },
}
export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'dark' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BOOT_GUARD }} />
      <noscript>
        <p style={{ position: 'fixed', inset: 'auto 0 0 0', padding: '20px 28px', background: '#111', color: '#e8e6e1', font: '16px system-ui, sans-serif' }}>scroll needs JavaScript. Turn it on for this site and reload.</p>
      </noscript>
      {children}
    </>
  )
}
