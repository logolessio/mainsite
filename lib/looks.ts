/**
 * Ready-made "looks": a noisy gradient picture and a matching banner. Anyone who does not upload their own gets one (chosen from
 * their handle, so it is always the same one), and everyone can pick another in onboarding or in their profile.
 * Nothing here reads the database, so pages, the browser and the picture route can all use it.
 */
export type Look = { id: string; name: string; light: string; mid: string; dark: string }

export const LOOKS: Look[] = [
  { id: 'ember', name: 'Ember', light: '#ff7a45', mid: '#8f2410', dark: '#140605' },
  { id: 'ocean', name: 'Ocean', light: '#3cc0e0', mid: '#0d4f73', dark: '#02080f' },
  { id: 'dusk', name: 'Dusk', light: '#c77bea', mid: '#40237a', dark: '#0b0b1e' },
  { id: 'forest', name: 'Forest', light: '#7fd18a', mid: '#175a30', dark: '#030a05' },
  { id: 'rose', name: 'Rose', light: '#ff82b0', mid: '#701845', dark: '#120309' },
  { id: 'sand', name: 'Sand', light: '#efd39a', mid: '#8f5f2e', dark: '#1a1008' },
  { id: 'violet', name: 'Violet', light: '#8d9bff', mid: '#2f349a', dark: '#06061a' },
  { id: 'mono', name: 'Mono', light: '#e4e4e8', mid: '#505058', dark: '#050505' },
]
export const LOOK_IDS = LOOKS.map((l) => l.id)
export const lookById = (id: string) => LOOKS.find((l) => l.id === id)

/** The same look for the same seed, every time. */
export function lookFor(seed: string): Look {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0
  return LOOKS[h % LOOKS.length]
}

// ---------- pictures kept as a look are stored as "g:<id>"; uploads are stored by their own id ----------
export const lookKey = (id: string) => `g:${id}`
export const isLookKey = (key: string | null | undefined): key is string => Boolean(key && key.startsWith('g:') && lookById(key.slice(2)))

/** The address of a person's picture: their upload, the look they chose, or the look their handle gets by default. */
export function avatarSrc(key: string | null | undefined, name: string, handle: string): string {
  if (key && !key.startsWith('g:')) return `/api/img/${key}`
  const look = isLookKey(key) ? key.slice(2) : lookFor(handle || name).id
  const letter = (name.trim()[0] ?? handle[0] ?? '').toUpperCase()
  return `/api/look/${look}?kind=avatar${letter ? `&l=${encodeURIComponent(letter)}` : ''}`
}

// ---------- the grain ----------
const grain = (size: number, strength = 0.5) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${strength} -0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/** CSS for a banner (and for the small previews): grain over a glow over a gradient. */
export const bannerCss = (l: Look) => `${grain(200)} 0 0/200px 200px, radial-gradient(110% 150% at 12% 0%, ${l.light} 0%, transparent 62%), linear-gradient(135deg, ${l.mid} 0%, ${l.dark} 100%)`
export const avatarCss = (l: Look) => `${grain(120)} 0 0/120px 120px, radial-gradient(100% 100% at 25% 15%, ${l.light} 0%, transparent 70%), linear-gradient(150deg, ${l.mid} 0%, ${l.dark} 100%)`

// ---------- the small previews in the picker ----------
// The picker tiles are small, so the big banner's grain (white specks on a dark picture) looks like dirt at that size. Here the grain is grey noise
// that is blended in with soft-light: it lightens and darkens a hair, so the colour stays clean and only the surface feels printed. Put
// `background-blend-mode: soft-light, normal, normal, normal` next to this (LOOK_TILE_BLEND).
const tileGrain = (size: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Cfilter id='n' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='.9 .9 .9 0 -.35 .9 .9 .9 0 -.35 .9 .9 .9 0 -.35 0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

export const LOOK_TILE_BLEND = 'soft-light, normal, normal, normal'

/** A picker tile: fine grain over a bright glow at the top left, a second softer glow at the bottom right, over the look's gradient. */
export const lookTileCss = (l: Look) =>
  `${tileGrain(160)} 0 0/160px 160px, radial-gradient(95% 120% at 8% 0%, ${l.light} 0%, transparent 62%), radial-gradient(70% 90% at 104% 108%, ${l.light}66 0%, transparent 70%), linear-gradient(135deg, ${l.mid} 0%, ${l.dark} 100%)`

/** The little picture on a tile: a glassy sphere with a highlight, the way a profile picture sits on the banner. */
export const lookOrbCss = (l: Look) =>
  `radial-gradient(60% 50% at 34% 24%, rgb(255 255 255 / 0.55) 0%, transparent 100%), radial-gradient(120% 120% at 28% 20%, ${l.light} 0%, ${l.mid} 58%, ${l.dark} 100%)`

/** The picture itself as an SVG, for the picture route (it works in an <img>, which a CSS background cannot). */
export function lookSvg(l: Look, kind: 'avatar' | 'banner', letter?: string) {
  const w = kind === 'avatar' ? 256 : 1200
  const h = kind === 'avatar' ? 256 : 400
  const angle = kind === 'avatar' ? { x2: 0.7, y2: 1 } : { x2: 1, y2: 1 }
  const safe = letter && /^[\p{L}\p{N}]$/u.test(letter) ? letter : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="${angle.x2}" y2="${angle.y2}"><stop offset="0" stop-color="${l.mid}"/><stop offset="1" stop-color="${l.dark}"/></linearGradient>
<radialGradient id="r" cx="${kind === 'avatar' ? 0.25 : 0.12}" cy="${kind === 'avatar' ? 0.15 : 0}" r="${kind === 'avatar' ? 0.95 : 0.75}"><stop offset="0" stop-color="${l.light}"/><stop offset="1" stop-color="${l.light}" stop-opacity="0"/></radialGradient>
<filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${kind === 'avatar' ? 0.95 : 0.8}" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 -0.1"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<rect width="${w}" height="${h}" fill="url(#r)"/>
<rect width="${w}" height="${h}" filter="url(#n)"/>
${safe ? `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="${Math.round(h * 0.46)}" font-weight="600" fill="#fff" fill-opacity="0.92">${safe}</text>` : ''}
</svg>`
}
