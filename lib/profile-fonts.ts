import { Bebas_Neue, Caveat, Geist, Geist_Mono, Instrument_Serif, Space_Grotesk } from 'next/font/google'
import type { FontId } from './profile-style'

// Loaded only for profile pages. Each is a CSS variable-free class so a profile can switch fonts instantly.
const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600'], display: 'swap', preload: false })
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', preload: false })
const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap', preload: false })
const condensed = Bebas_Neue({ subsets: ['latin'], weight: '400', display: 'swap', preload: false })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', preload: false })
const hand = Caveat({ subsets: ['latin'], weight: ['500', '700'], display: 'swap', preload: false })

export const PROFILE_FONT_CLASS: Record<FontId, string> = {
  geist: geist.className,
  mono: mono.className,
  serif: serif.className,
  condensed: condensed.className,
  grotesk: grotesk.className,
  hand: hand.className,
}
