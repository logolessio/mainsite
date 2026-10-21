import { IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google'

// The two faces of a client's page: a very heavy grotesk for the big words, and a small monospace for everything said quietly.
const grotesk = Schibsted_Grotesk({ subsets: ['latin'], display: 'swap', preload: false, weight: ['500', '700', '800', '900'], variable: '--font-grot' })
const plex = IBM_Plex_Mono({ subsets: ['latin'], display: 'swap', preload: false, weight: ['300', '400', '500'], variable: '--font-plex' })

/** Put on the element that holds a client's page, so `.stage-grot` and `.stage-mono` find their fonts. */
export const STAGE_FONTS = `${grotesk.variable} ${plex.variable}`
