// Stable keys for editable site text. The key is a hash of the ORIGINAL wording, so it works the same on the server and
// in the browser, and an override keeps applying until the original sentence itself is changed in the code.

export const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

function fnv(str: string, seed: number) {
  let h = seed >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

export function copyKey(original: string) {
  const s = norm(original)
  return `c_${fnv(s, 0x811c9dc5)}${fnv(s, 0x9747b28c)}`
}

export const HERO_VARIANTS_KEY = 'hero.variants'
export const HERO_VARIANTS_DEFAULT = [
  'views have value',
  'every view has value',
  'your views have value',
  'real views, real value',
  'views are worth something',
  'views have value, and so do you',
  'put a price on attention',
  'attention, paid fairly',
  'every thousand counts',
  'the views were always valuable',
  'views that pay',
  'turn views into value',
  'worth every view',
  'value lives in views',
  'make your views count',
  'good clips deserve good pay',
]
