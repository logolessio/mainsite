import type { Metadata, Viewport } from 'next'

// This is scroll.logoless.io (middleware.ts serves it at the address's root). It is a site of its own, so it has no feature flag and no launch page.
export const metadata: Metadata = {
  title: 'scroll | logoless',
  description: 'Scroll through movie trailers, like what you love and see where to watch it.',
  robots: { index: false },
}
export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'dark' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
