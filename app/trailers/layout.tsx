import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = {
  title: 'Trailers | logoless',
  description: 'Scroll through movie trailers, like what you love and see where to watch it.',
  robots: { index: false },
}
export const viewport: Viewport = { themeColor: '#000000', colorScheme: 'dark' }

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await featureOn('trailers'))) notFound()
  return children
}
