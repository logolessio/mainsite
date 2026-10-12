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
  'get paid for the clips you cut',
  'clips that pay',
  'post it, get paid',
  'pick a campaign, cut a clip',
  'good clips should pay',
  'paid per thousand views',
]
