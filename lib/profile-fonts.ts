import {
  Bebas_Neue,
  Bungee,
  Caveat,
  Cinzel_Decorative,
  Creepster,
  Fredoka,
  Geist,
  Geist_Mono,
  Instrument_Serif,
  MedievalSharp,
  Orbitron,
  Pacifico,
  Press_Start_2P,
  Space_Grotesk,
  UnifrakturCook,
} from 'next/font/google'
import type { FontId } from './profile-style'

// Loaded only where profiles are shown. Discord-style display name fonts: medieval, gothic, regal, vampyre, 8-bit, and more.
const geist = Geist({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '600', '700'] })
const mono = Geist_Mono({ subsets: ['latin'], display: 'swap', preload: false })
const serif = Instrument_Serif({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const condensed = Bebas_Neue({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const grotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, weight: ['400', '500', '700'] })
const hand = Caveat({ subsets: ['latin'], display: 'swap', preload: false, weight: ['500', '700'] })
const medieval = MedievalSharp({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const gothic = UnifrakturCook({ subsets: ['latin'], display: 'swap', preload: false, weight: '700' })
const regal = Cinzel_Decorative({ subsets: ['latin'], display: 'swap', preload: false, weight: ['700', '900'] })
const vampyre = Creepster({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const bit8 = Press_Start_2P({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const tempo = Bungee({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })
const jelly = Fredoka({ subsets: ['latin'], display: 'swap', preload: false, weight: ['500', '700'] })
const modern = Orbitron({ subsets: ['latin'], display: 'swap', preload: false, weight: ['500', '700', '900'] })
const script = Pacifico({ subsets: ['latin'], display: 'swap', preload: false, weight: '400' })

export const PROFILE_FONT_CLASS: Record<FontId, string> = {
  geist: geist.className,
  mono: mono.className,
  serif: serif.className,
  condensed: condensed.className,
  grotesk: grotesk.className,
  hand: hand.className,
  medieval: medieval.className,
  gothic: gothic.className,
  regal: regal.className,
  vampyre: vampyre.className,
  bit8: bit8.className,
  tempo: tempo.className,
  jelly: jelly.className,
  modern: modern.className,
  script: script.className,
}

/** Some of these fonts have very wide or very small letters, so the name is scaled to look even. */
export const FONT_SCALE: Partial<Record<FontId, string>> = { bit8: 'text-[1.15rem] leading-snug', regal: 'text-[1.7rem]', vampyre: 'text-[2.1rem]', gothic: 'text-[2.2rem]', script: 'text-[1.9rem]', hand: 'text-[2.2rem]', condensed: 'text-[2.4rem]', modern: 'text-[1.5rem]', tempo: 'text-[1.6rem]' }
