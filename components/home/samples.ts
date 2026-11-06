import type { BioPageData } from '@/components/bio/context'
import { type BioBlock, DEFAULT_BIO, PRESETS, applyPreset, normalizeBio } from '@/lib/bio'

const link = (id: string, title: string, url: string, note = '', pin = false): BioBlock => ({ id, t: 'link', title, url, icon: 'auto', note, hidden: false, pin })
const social = (id: string, platform: string): BioBlock => ({ id, t: 'social', platform, url: `https://${platform}.com/x`, hidden: false })

const BLOCKS: BioBlock[] = [
  link('aaaa0001', 'Showreel 2025', 'https://youtube.com/watch?v=x', 'Two minutes of my best cuts', true),
  link('aaaa0002', 'Latest music video', 'https://youtube.com/watch?v=y', 'Directed and edited'),
  link('aaaa0003', 'Presets and packs', 'https://gumroad.com', 'LUTs, overlays, sound'),
  link('aaaa0004', 'Book me', 'mailto:hi@example.com', 'Open for May'),
  social('aaaa0006', 'instagram'),
  social('aaaa0007', 'tiktok'),
  social('aaaa0008', 'youtube'),
  social('aaaa0009', 'discord'),
]

function page(handle: string, name: string, bio: string, layout: string, look: string, extra: Record<string, unknown> = {}): BioPageData {
  let cfg = normalizeBio({ ...DEFAULT_BIO, layout, blocks: BLOCKS })
  const p = PRESETS.find((x) => x.id === look)
  if (p) cfg = applyPreset(cfg, p)
  cfg = normalizeBio({ ...cfg, ...extra, fx: { ...cfg.fx, reveal: 'none', enter: 'none', grain: 0, scanlines: 0, spotlight: false, float: false }, cursor: { ...cfg.cursor, trail: 'none' } }, cfg)
  return { handle, name, bio, avatar: null, config: cfg, views: null, badges: [{ id: 'uid', label: String(3 + handle.length), hint: '' }] }
}

/** Pages made up for the home page, one for each way of laying a page out (and a few more looks for the pile of phones). */
export const SAMPLES = {
  classic: page('luna', 'Luna Ray', 'Editor and motion designer. Music videos, tour visuals, fast cuts.', 'classic', 'embers'),
  card: page('mx', 'Max Vale', 'Colour, rhythm and a lot of coffee.', 'card', 'aurora'),
  side: page('nova', 'Nova', 'Edits that stay in your head.', 'side', 'sakura'),
  list: page('kit', 'Kit', 'Cuts, colour and sound.', 'list', 'smoke'),
  cover: page('ash', 'Ash', 'Motion design from Leeds.', 'cover', 'sakura'),
  minimal: page('ben', 'Ben Roe', 'Editor. Available in May.', 'minimal', 'paper'),
  canvas: page('rae', 'Rae', 'Put everything where you want it.', 'canvas', 'storm'),
  classicSnow: page('io', 'Io', 'Visuals for live shows.', 'classic', 'snow'),
  classicForest: page('ep', 'Ep. 1', 'Long form, one story at a time.', 'classic', 'forest'),
} satisfies Record<string, BioPageData>
export type SampleId = keyof typeof SAMPLES
