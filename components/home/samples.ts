import type { BioPageData } from '@/components/bio/context'
import { type BioBlock, DEFAULT_BIO, PRESETS, applyPreset, normalizeBio } from '@/lib/bio'

const link = (id: string, title: string, url: string, note = '', pin = false): BioBlock => ({ id, t: 'link', title, url, icon: 'auto', note, hidden: false, pin })
const social = (id: string, platform: string): BioBlock => ({ id, t: 'social', platform, url: `https://${platform}.com/x`, hidden: false })

const BLOCKS: BioBlock[] = [
  link('aaaa0001', 'Showreel 2025', 'https://youtube.com/watch?v=x', 'Two minutes of my best cuts', true),
  link('aaaa0002', 'Latest music video', 'https://youtube.com/watch?v=y', 'Directed and edited'),
  link('aaaa0003', 'Presets and packs', 'https://gumroad.com', 'LUTs, overlays, sound'),
  link('aaaa0004', 'Book me', 'mailto:hi@example.com', 'Open for May'),
  link('aaaa0005', 'Discord', 'https://discord.gg/x'),
  social('aaaa0006', 'instagram'),
  social('aaaa0007', 'tiktok'),
  social('aaaa0008', 'youtube'),
  social('aaaa0009', 'x'),
]

function page(handle: string, name: string, bio: string, layout: string, look: string, extra: Record<string, unknown> = {}, tone?: number): BioPageData {
  let cfg = normalizeBio({ ...DEFAULT_BIO, layout, blocks: BLOCKS })
  const p = PRESETS.find((x) => x.id === look)
  if (p) cfg = applyPreset(cfg, p)
  const coloured = Boolean(p?.set.colors)
  cfg = normalizeBio({ ...cfg, theme: { ...cfg.theme, ...(coloured ? {} : { radius: 0 }), ...(tone === undefined || coloured ? {} : { tone }) }, bg: { ...cfg.bg, ...(tone === undefined || coloured ? {} : { tone }) }, avatar: { ...cfg.avatar, shape: coloured ? 'rounded' : 'square' } }, cfg)
  cfg = normalizeBio({ ...cfg, ...extra, fx: { ...cfg.fx, reveal: 'none', enter: 'none', grain: 0, scanlines: 0, spotlight: false }, cursor: { ...cfg.cursor, trail: 'none' } }, cfg)
  return { handle, name, bio, avatar: null, config: cfg, views: null, badges: [{ id: 'uid', label: String(3 + handle.length), hint: '' }] }
}

/** Pages made up for the home page, one for each way of laying a page out. */
export const SAMPLES = {
  aura: page('luna', 'Luna Ray', 'Editor and motion designer. Music videos, tour visuals, fast cuts.', 'aura', 'aurora'),
  split: page('mx', 'Max Vale', 'Colour, rhythm and a lot of coffee.', 'split', 'ocean'),
  poster: page('k', 'k', 'Cuts for artists you have heard of.', 'poster', 'lava'),
  bento: page('ghostcut', 'Ghost Cut', 'A one person studio.', 'bento', 'neon', {}, 52),
  stack: page('nova', 'Nova', 'Edits that stay in your head.', 'stack', 'rose'),
  orbit: page('io', 'Io', 'Visuals for live shows.', 'orbit', 'midnight'),
  index: page('paper', 'Paper Street', 'Editorial cuts and title design.', 'index', 'candy', {}, 92),
  terminal: page('root', 'root', 'I edit in the terminal. Do not ask.', 'terminal', 'forest'),
  chapters: page('ep', 'Ep. 1', 'Long form, one story at a time.', 'chapters', 'gold'),
  reel: page('reel', 'Reel', 'A film strip of everything I made.', 'reel', 'vapor'),
} satisfies Record<string, BioPageData>
export type SampleId = keyof typeof SAMPLES
