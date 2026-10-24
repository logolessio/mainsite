import type { Metadata, Viewport } from 'next'
import { Motion4KOptimizer } from '@/components/method/motion4k-optimizer'

export const metadata: Metadata = {
  title: 'Motion4K Optimizer | logoless',
  description: 'Patch 4K and high frame rate edits for TikTok and Reels: Lanczos downscaling, anti-compression sharpening and 60fps motion blending, all in your browser. Nothing is uploaded.',
}

export const viewport: Viewport = { themeColor: '#000000' }

/** method.logoless.io (see middleware.ts): one page, and everything it does happens in the visitor's browser. */
export default function MethodPage() {
  return <Motion4KOptimizer />
}
