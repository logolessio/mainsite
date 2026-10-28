/**
 * The catalogue of 17.logoless.io. Every pack on the site is one entry here: the home page grid, its search and filters, and each pack's page
 * (17.logoless.io/p/<slug>) are all made from this list. Newest first is by `added`.
 *
 * The packs below are SAMPLES with made-up titles, there to show the layout. Replace them with the team's real packs, and only list footage
 * we are allowed to share. A pack's cover is drawn by the site from `art` (components/seventeen/poster.tsx); give it `poster` (a path under
 * public/17/) to use a picture instead. A file without `url` sends people to the Discord, where the team posts the link.
 */

export type PackKind = 'Film' | 'Series' | 'Anime' | 'Sport' | 'B-roll'

/** How the site draws a cover when there is no picture: two background colours, a light colour, and one of six shapes. */
export type PackArt = { from: string; to: string; accent: string; shape: 'orb' | 'beam' | 'grid' | 'rings' | 'slash' | 'dusk' }

export type PackFile = {
  name: string
  quality: string
  /** e.g. 4:12 */
  length?: string
  /** e.g. 1.2 GB */
  size?: string
  editor: string
  /** the download (Google Drive, Mega, …). Without it the button opens the Discord. */
  url?: string
}

export type Pack = {
  slug: string
  title: string
  year?: string
  kind: PackKind
  tagline: string
  /** the best quality in the pack, shown on the cover and the card */
  quality: string
  editor: string
  genres: string[]
  runtime?: string
  director?: string
  cast?: string[]
  /** a YouTube link: shows the Watch trailer button on the pack's page */
  trailer?: string
  poster?: string
  art: PackArt
  /** when it went up, YYYY-MM-DD */
  added: string
  files: PackFile[]
}

/** Builds a pack's files from [name, length, size] rows that share a quality and an editor. */
const clips = (quality: string, editor: string, rows: [name: string, length: string, size: string][]): PackFile[] =>
  rows.map(([name, length, size]) => ({ name, length, size, quality, editor }))

export const PACKS: Pack[] = [
  {
    slug: 'neon-requiem',
    title: 'Neon Requiem',
    year: '2025',
    kind: 'Film',
    tagline: 'The city never forgets a name.',
    quality: '4K REMUX HEVC',
    editor: 'nova',
    genres: ['Neo-noir', 'Thriller'],
    runtime: '2h 11m',
    director: 'Sample entry',
    art: { from: '#12051f', to: '#020106', accent: '#ff2d96', shape: 'beam' },
    added: '2026-10-26',
    files: clips('4K REMUX HEVC', 'nova', [
      ['Ione Vale, every scene', '14:20', '3.1 GB'],
      ['Rooftop chase', '3:42', '820 MB'],
      ['The rain monologue', '2:05', '460 MB'],
      ['Final standoff', '4:58', '1.1 GB'],
    ]),
  },
  {
    slug: 'saltwater-kings',
    title: 'Saltwater Kings',
    year: '2024',
    kind: 'Series',
    tagline: 'Every tide has a ruler.',
    quality: '4K WEB-DL HEVC',
    editor: 'rift',
    genres: ['Drama', 'Crime'],
    runtime: '52 min per episode',
    art: { from: '#03202a', to: '#010608', accent: '#4ba9dc', shape: 'rings' },
    added: '2026-10-24',
    files: clips('4K WEB-DL HEVC', 'rift', [
      ['Cass Moreno (S01)', '11:02', '2.4 GB'],
      ['Cass Moreno (S02)', '9:47', '2.1 GB'],
      ['Elias Brandt (S01)', '7:15', '1.6 GB'],
      ['The harbour fire (S02) EP 6', '3:30', '760 MB'],
      ['Mara Kell (S01–S02)', '12:40', '2.8 GB'],
    ]),
  },
  {
    slug: 'the-long-static',
    title: 'The Long Static',
    year: '2026',
    kind: 'Film',
    tagline: 'Somebody is still broadcasting.',
    quality: '8K ULTRA HD',
    editor: 'sable',
    genres: ['Sci-fi', 'Mystery'],
    runtime: '2h 24m',
    art: { from: '#1a1d22', to: '#030405', accent: '#d8e4ee', shape: 'grid' },
    added: '2026-10-22',
    files: clips('8K ULTRA HD', 'sable', [
      ['Signal tower, full sequence', '6:12', '4.4 GB'],
      ['Dr. Anya Holt, every scene', '10:30', '7.2 GB'],
      ['Desert landing', '2:48', '1.9 GB'],
    ]),
  },
  {
    slug: 'kai-mercer-iron-mile',
    title: 'Kai Mercer',
    year: '2026',
    kind: 'Sport',
    tagline: '1080p60, 12:00, every round of the Iron Mile fight.',
    quality: '1080p60',
    editor: '17 team',
    genres: ['Boxing'],
    runtime: '12 min',
    art: { from: '#2a0508', to: '#050101', accent: '#ff1f38', shape: 'slash' },
    added: '2026-10-21',
    files: [
      { name: 'Kai Mercer, Iron Mile (with Topaz + AE CC)', quality: '1080p60', length: '12:00', size: '1.8 GB', editor: '17 team' },
      { name: 'Kai Mercer, Iron Mile (Topaz only)', quality: '1080p60', length: '12:00', size: '930 MB', editor: '17 team' },
    ],
  },
  {
    slug: 'ember-and-ash',
    title: 'Ember & Ash',
    year: '2023',
    kind: 'Series',
    tagline: 'All crowns burn.',
    quality: '4K REMUX HEVC',
    editor: 'nova',
    genres: ['Fantasy', 'Drama'],
    runtime: '60 min per episode',
    art: { from: '#2b1004', to: '#070201', accent: '#ffc857', shape: 'dusk' },
    added: '2026-10-19',
    files: clips('4K REMUX HEVC', 'nova', [
      ['Queen Sefa (S01)', '13:05', '2.9 GB'],
      ['Queen Sefa (S02) EP 1–4', '8:22', '1.8 GB'],
      ['Ronan of the Ash (S01)', '9:10', '2.0 GB'],
      ['The dragon gate (S02) EP 8', '4:44', '1.0 GB'],
    ]),
  },
  {
    slug: 'velocity-nine',
    title: 'Velocity Nine',
    year: '2025',
    kind: 'Film',
    tagline: 'Nine laps. No brakes.',
    quality: '4K REMUX HEVC',
    editor: 'rift',
    genres: ['Action', 'Racing'],
    runtime: '1h 58m',
    art: { from: '#05121f', to: '#010307', accent: '#4678ff', shape: 'beam' },
    added: '2026-10-17',
    files: clips('4K REMUX HEVC', 'rift', [
      ['Night race, full sequence', '7:31', '1.7 GB'],
      ['Jules Arden, every scene', '11:48', '2.6 GB'],
    ]),
  },
  {
    slug: 'paper-moons',
    title: 'Paper Moons',
    year: '2022',
    kind: 'Anime',
    tagline: 'A sky folded out of letters.',
    quality: '4K UPSCALE',
    editor: 'sable',
    genres: ['Romance', 'Slice of life'],
    runtime: '24 min per episode',
    art: { from: '#1c0f2e', to: '#06030b', accent: '#9650ff', shape: 'orb' },
    added: '2026-10-15',
    files: clips('4K UPSCALE', 'sable', [
      ['Hana, every scene (S01)', '15:12', '2.2 GB'],
      ['Rooftop confession EP 11', '2:58', '420 MB'],
      ['Festival night EP 7', '3:40', '510 MB'],
    ]),
  },
  {
    slug: 'red-line-district',
    title: 'Red Line District',
    year: '2026',
    kind: 'Series',
    tagline: 'Last stop for honest men.',
    quality: '4K WEB-DL HEVC',
    editor: 'nova',
    genres: ['Crime', 'Thriller'],
    runtime: '48 min per episode',
    art: { from: '#200306', to: '#040001', accent: '#ff1f38', shape: 'grid' },
    added: '2026-10-13',
    files: clips('4K WEB-DL HEVC', 'nova', [
      ['Detective Ruiz (S01)', '10:20', '2.3 GB'],
      ['Silas Crane (S01)', '8:05', '1.8 GB'],
      ['Subway shootout EP 5', '3:15', '720 MB'],
    ]),
  },
  {
    slug: 'night-drive-tokyo',
    title: 'Night Drive',
    year: '2026',
    kind: 'B-roll',
    tagline: 'City lights at 60fps, shot for edits.',
    quality: '4K 60FPS',
    editor: '17 team',
    genres: ['City', 'Cars'],
    runtime: '18 min',
    art: { from: '#06061a', to: '#010104', accent: '#2ed0b0', shape: 'dusk' },
    added: '2026-10-11',
    files: clips('4K 60FPS', '17 team', [
      ['Highway, wide', '6:00', '2.6 GB'],
      ['Tunnel lights', '4:30', '1.9 GB'],
      ['Rain on the glass', '7:30', '3.2 GB'],
    ]),
  },
  {
    slug: 'glass-harbor',
    title: 'Glass Harbor',
    year: '2024',
    kind: 'Film',
    tagline: 'What the water keeps.',
    quality: '4K REMUX HEVC',
    editor: 'rift',
    genres: ['Thriller'],
    runtime: '2h 02m',
    art: { from: '#0b1a1c', to: '#020505', accent: '#9fe3e0', shape: 'rings' },
    added: '2026-10-09',
    files: clips('4K REMUX HEVC', 'rift', [
      ['Leah Strand, every scene', '12:44', '2.8 GB'],
      ['The lighthouse', '3:05', '690 MB'],
    ]),
  },
  {
    slug: 'last-light-over-vela',
    title: 'Last Light Over Vela',
    year: '2025',
    kind: 'Film',
    tagline: 'The last ship home is leaving.',
    quality: '4K DOLBY VISION',
    editor: 'sable',
    genres: ['Sci-fi', 'Adventure'],
    runtime: '2h 36m',
    art: { from: '#130a24', to: '#020104', accent: '#ff8a3d', shape: 'orb' },
    added: '2026-10-07',
    files: clips('4K DOLBY VISION', 'sable', [
      ['Captain Oro, every scene', '16:02', '4.0 GB'],
      ['The launch', '4:20', '1.1 GB'],
      ['Ring station fight', '5:12', '1.3 GB'],
    ]),
  },
  {
    slug: 'quiet-wolves',
    title: 'Quiet Wolves',
    year: '2023',
    kind: 'Series',
    tagline: 'The pack hunts in silence.',
    quality: '4K REMUX HEVC',
    editor: 'nova',
    genres: ['Drama', 'Western'],
    runtime: '55 min per episode',
    art: { from: '#1a1712', to: '#040403', accent: '#e8dcc2', shape: 'slash' },
    added: '2026-10-05',
    files: clips('4K REMUX HEVC', 'nova', [
      ['Wren Hollis (S01)', '9:55', '2.2 GB'],
      ['Wren Hollis (S02)', '10:40', '2.4 GB'],
      ['The canyon ride (S01) EP 3', '2:50', '640 MB'],
    ]),
  },
  {
    slug: 'afterglow-summer',
    title: 'Afterglow Summer',
    year: '2024',
    kind: 'Film',
    tagline: 'One summer, then everything else.',
    quality: '4K WEB-DL HEVC',
    editor: 'sable',
    genres: ['Romance', 'Coming of age'],
    runtime: '1h 49m',
    art: { from: '#2c0d1d', to: '#080206', accent: '#ffb3c7', shape: 'dusk' },
    added: '2026-10-03',
    files: clips('4K WEB-DL HEVC', 'sable', [
      ['Noa and Theo, every scene', '13:30', '2.9 GB'],
      ['The pier at sunset', '2:40', '590 MB'],
    ]),
  },
  {
    slug: 'ghost-signal',
    title: 'Ghost Signal',
    year: '2026',
    kind: 'Anime',
    tagline: 'Someone hacked the afterlife.',
    quality: '1080p BLU-RAY',
    editor: 'rift',
    genres: ['Cyberpunk', 'Action'],
    runtime: '24 min per episode',
    art: { from: '#03141a', to: '#000406', accent: '#2ed0b0', shape: 'grid' },
    added: '2026-10-01',
    files: clips('1080p BLU-RAY', 'rift', [
      ['Rei, every scene (S01)', '14:10', '1.6 GB'],
      ['The server tower EP 9', '3:22', '380 MB'],
    ]),
  },
  {
    slug: 'monsoon-market',
    title: 'Monsoon Market',
    year: '2026',
    kind: 'B-roll',
    tagline: 'Street food, neon and rain. Shot for edits.',
    quality: '4K 60FPS',
    editor: '17 team',
    genres: ['City', 'Food'],
    runtime: '14 min',
    art: { from: '#0a1b10', to: '#020603', accent: '#ffc857', shape: 'beam' },
    added: '2026-09-29',
    files: clips('4K 60FPS', '17 team', [
      ['Market at night', '5:20', '2.3 GB'],
      ['Rain and steam, slow motion', '8:40', '3.7 GB'],
    ]),
  },
  {
    slug: 'the-ninth-floor',
    title: 'The Ninth Floor',
    year: '2025',
    kind: 'Film',
    tagline: 'The lift only goes up.',
    quality: '4K REMUX HEVC',
    editor: 'nova',
    genres: ['Horror'],
    runtime: '1h 41m',
    art: { from: '#101010', to: '#000000', accent: '#ff1f38', shape: 'rings' },
    added: '2026-09-27',
    files: clips('4K REMUX HEVC', 'nova', [
      ['Iris Kane, every scene', '11:12', '2.5 GB'],
      ['The corridor', '2:30', '560 MB'],
    ]),
  },
  {
    slug: 'static-hearts',
    title: 'Static Hearts',
    year: '2022',
    kind: 'Series',
    tagline: 'Love, on a bad connection.',
    quality: '1080p WEB-DL',
    editor: 'sable',
    genres: ['Romance', 'Comedy'],
    runtime: '30 min per episode',
    art: { from: '#1d0b26', to: '#050208', accent: '#ff2d96', shape: 'orb' },
    added: '2026-09-25',
    files: clips('1080p WEB-DL', 'sable', [
      ['June Park (S01)', '8:30', '980 MB'],
      ['Leo Varga (S01)', '7:10', '840 MB'],
    ]),
  },
  {
    slug: 'hollow-crown-fc',
    title: 'Hollow Crown FC',
    year: '2026',
    kind: 'Sport',
    tagline: '1080p H.265, the whole cup final night.',
    quality: '1080p H.265',
    editor: '17 team',
    genres: ['Football'],
    runtime: '9 min',
    art: { from: '#06180c', to: '#010502', accent: '#e9ffe0', shape: 'slash' },
    added: '2026-09-23',
    files: clips('1080p H.265', '17 team', [
      ['Cup final, every goal', '5:40', '720 MB'],
      ['Number 10, every touch', '3:20', '430 MB'],
    ]),
  },
]

export const KINDS: PackKind[] = ['Film', 'Series', 'Anime', 'Sport', 'B-roll']

export const packBySlug = (slug: string) => PACKS.find((p) => p.slug === slug) ?? null

/** Newest first. */
export const newestPacks = () => [...PACKS].sort((a, b) => b.added.localeCompare(a.added))

/** What a pack is called in lists: the title, with the year when there is one. */
export const packName = (p: Pick<Pack, 'title' | 'year'>) => (p.year ? `${p.title} (${p.year})` : p.title)
