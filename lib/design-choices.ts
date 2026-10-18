import { FONT_IDS } from './fonts'

// Design choices that are a pick from a short list (not a switch, not a slider): how the text on a campaign cover looks, and how the
// campaigns are laid out. Safe for the browser and the server: only lists and small helpers. They are saved in the settings table.

export type Choice = { value: string; label: string; hint?: string }

export const COVER_TEXT_DEFAULTS = {
  design_cover_font: 'site',
  design_cover_size: 'm',
  design_cover_case: 'normal',
  design_cover_align: 'left',
  design_cover_panel: 'solid',
  design_cover_show: 'hover',
  design_cover_meta: 'both',
} as const

export const LAYOUT_DEFAULTS = { design_layout: 'grid' } as const

export type ChoiceKey = keyof typeof COVER_TEXT_DEFAULTS | keyof typeof LAYOUT_DEFAULTS

export const LAYOUTS: Choice[] = [
  { value: 'grid', label: 'Grid', hint: 'Four covers across. The standard look.' },
  { value: 'large', label: 'Large', hint: 'Three bigger covers across, for a calmer page.' },
  { value: 'compact', label: 'Compact', hint: 'Six small covers across, to see more at once.' },
  { value: 'mosaic', label: 'Mosaic', hint: 'Some covers are twice the size, like a magazine page.' },
  { value: 'list', label: 'List', hint: 'One row per campaign with the details beside the cover.' },
]

export const COVER_TEXT: { key: keyof typeof COVER_TEXT_DEFAULTS; label: string; hint: string; options: Choice[] }[] = [
  {
    key: 'design_cover_show',
    label: 'When the text shows',
    hint: 'On hover the name slides up when the pointer is on a cover. Always keeps it on every cover (also the way to show it on a phone).',
    options: [
      { value: 'hover', label: 'On hover' },
      { value: 'always', label: 'Always' },
    ],
  },
  {
    key: 'design_cover_panel',
    label: 'Panel behind the text',
    hint: 'Solid is a dark bar, glass lets the cover show through, fade is only a soft shade.',
    options: [
      { value: 'solid', label: 'Solid' },
      { value: 'glass', label: 'Glass' },
      { value: 'fade', label: 'Fade' },
    ],
  },
  {
    key: 'design_cover_size',
    label: 'Name size',
    hint: 'How big the campaign name is on a cover.',
    options: [
      { value: 's', label: 'Small' },
      { value: 'm', label: 'Medium' },
      { value: 'l', label: 'Large' },
    ],
  },
  {
    key: 'design_cover_case',
    label: 'Letters',
    hint: 'The name as it is written, in capitals, or all lower case.',
    options: [
      { value: 'normal', label: 'As written' },
      { value: 'upper', label: 'CAPITALS' },
      { value: 'lower', label: 'lower case' },
    ],
  },
  {
    key: 'design_cover_align',
    label: 'Alignment',
    hint: 'Where the text sits across the cover.',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Centre' },
    ],
  },
  {
    key: 'design_cover_meta',
    label: 'Line under the name',
    hint: 'Who made it and what it pays.',
    options: [
      { value: 'both', label: 'Artist and rate' },
      { value: 'creator', label: 'Artist' },
      { value: 'rate', label: 'Rate' },
      { value: 'none', label: 'Nothing' },
    ],
  },
]

/** Every pick-from-a-list key and the values it may hold (the cover font is any typeface of the site, or "site" for the current headline face). */
export const CHOICES: Record<ChoiceKey, readonly string[]> = {
  design_cover_font: ['site', ...FONT_IDS],
  design_cover_size: ['s', 'm', 'l'],
  design_cover_case: ['normal', 'upper', 'lower'],
  design_cover_align: ['left', 'center'],
  design_cover_panel: ['solid', 'glass', 'fade'],
  design_cover_show: ['hover', 'always'],
  design_cover_meta: ['both', 'creator', 'rate', 'none'],
  design_layout: LAYOUTS.map((l) => l.value),
}
export const CHOICE_KEYS = Object.keys(CHOICES) as [ChoiceKey, ...ChoiceKey[]]
export const CHOICE_DEFAULTS: Record<ChoiceKey, string> = { ...COVER_TEXT_DEFAULTS, ...LAYOUT_DEFAULTS }

export const isChoice = (key: string, value: string): boolean => (CHOICE_KEYS as string[]).includes(key) && CHOICES[key as ChoiceKey].includes(value)

export type CoverText = { font: string; size: string; case: string; align: string; panel: string; show: string; meta: string }
export type LayoutId = 'grid' | 'large' | 'compact' | 'mosaic' | 'list'

const pick = (key: ChoiceKey, value: string | undefined) => (value && CHOICES[key].includes(value) ? value : CHOICE_DEFAULTS[key])

/** The saved cover text and layout choices read safely: anything missing or not on the list falls back to the standard look. */
export function parseChoices(s: Partial<Record<string, string>>): { cover: CoverText; layout: LayoutId } {
  return {
    cover: {
      font: pick('design_cover_font', s.design_cover_font),
      size: pick('design_cover_size', s.design_cover_size),
      case: pick('design_cover_case', s.design_cover_case),
      align: pick('design_cover_align', s.design_cover_align),
      panel: pick('design_cover_panel', s.design_cover_panel),
      show: pick('design_cover_show', s.design_cover_show),
      meta: pick('design_cover_meta', s.design_cover_meta),
    },
    layout: pick('design_layout', s.design_layout) as LayoutId,
  }
}

export const STANDARD_COVER: CoverText = parseChoices({}).cover
