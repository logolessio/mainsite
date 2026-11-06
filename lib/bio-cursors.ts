// The cursors a page can wear: drawn here as SVG, in black and white only. Each has a pointer (what it looks like over the page) and a "link" version (over a link or
// a button). `ink` picks white with a black edge or black with a white edge, so a cursor shows on any background. Shared by the browser and the server.

type Shape = { body: string; hot: [number, number] }
export type CursorPreset = { id: string; name: string; arrow: Shape; link: Shape }

// F is the fill and S the edge; both are swapped in by `cursorSvg`.
const E = 'fill="F" stroke="S" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"'
const L = 'fill="none" stroke="S" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"'
const T = 'fill="none" stroke="F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
/** A line drawn twice: first the edge, then the ink on top, so thin strokes stay visible on light and dark. */
const stroke = (d: string) => `<path d="${d}" ${L}/><path d="${d}" ${T}/>`

const ARROW = `<path d="M6 3.5v21.2l5.6-5.3 3.6 8.1 3.7-1.7-3.5-7.9h8z" ${E}/>`
const HAND = `<path d="M12.2 4.6a2 2 0 0 1 4 0v9.3l.9-.3a2 2 0 0 1 2.5 1.4l.1.5.9-.3a2 2 0 0 1 2.5 1.4l.1.4.8-.2a2 2 0 0 1 2.5 1.8v5.2c0 3.8-3 6.8-6.8 6.8h-2.4a8 8 0 0 1-6.4-3.2L5.6 21.2a2 2 0 0 1 3.1-2.5l3.5 3.1z" ${E}/>`

export const CURSORS: CursorPreset[] = [
  { id: 'arrow', name: 'Arrow', arrow: { body: ARROW, hot: [6, 3.5] }, link: { body: HAND, hot: [14.2, 3] } },
  {
    id: 'dot',
    name: 'Dot',
    arrow: { body: `<circle cx="16" cy="16" r="4.6" ${E}/>`, hot: [16, 16] },
    link: { body: `<circle cx="16" cy="16" r="10" fill="none" stroke="S" stroke-width="3.6"/><circle cx="16" cy="16" r="10" fill="none" stroke="F" stroke-width="1.8"/><circle cx="16" cy="16" r="2.2" ${E}/>`, hot: [16, 16] },
  },
  {
    id: 'ring',
    name: 'Ring',
    arrow: { body: `<circle cx="16" cy="16" r="9" fill="none" stroke="S" stroke-width="3.8"/><circle cx="16" cy="16" r="9" fill="none" stroke="F" stroke-width="2"/>`, hot: [16, 16] },
    link: { body: `<circle cx="16" cy="16" r="12" fill="F" fill-opacity=".92" stroke="S" stroke-width="1.7"/>`, hot: [16, 16] },
  },
  {
    id: 'cross',
    name: 'Crosshair',
    arrow: { body: stroke('M16 3v9M16 20v9M3 16h9M20 16h9'), hot: [16, 16] },
    link: { body: `${stroke('M16 3v6M16 23v6M3 16h6M23 16h6')}<circle cx="16" cy="16" r="6.5" fill="none" stroke="S" stroke-width="3.6"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="F" stroke-width="1.8"/>`, hot: [16, 16] },
  },
  {
    id: 'playhead',
    name: 'Playhead',
    arrow: { body: `<path d="M9.5 3.5h13v7.2L16 16.5 9.5 10.7z" ${E}/>${stroke('M16 17v12')}`, hot: [16, 4] },
    link: { body: `<path d="M9.5 3.5h13v7.2L16 16.5 9.5 10.7z" ${E}/>${stroke('M16 17v6')}<rect x="12.8" y="22.5" width="6.4" height="6.4" rx="1.4" ${E}/>`, hot: [16, 4] },
  },
  {
    id: 'frame',
    name: 'Viewfinder',
    arrow: { body: stroke('M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6'), hot: [16, 16] },
    link: { body: `${stroke('M8 13V8h5M19 8h5v5M24 19v5h-5M13 24H8v-5')}<circle cx="16" cy="16" r="2.2" ${E}/>`, hot: [16, 16] },
  },
  {
    id: 'spark',
    name: 'Spark',
    arrow: { body: `<path d="M16 2.5c.9 7.6 3.4 11.2 13.5 13.5-10.1 2.3-12.6 5.9-13.5 13.5-.9-7.6-3.4-11.2-13.5-13.5C12.6 13.7 15.1 10.1 16 2.5z" ${E}/>`, hot: [16, 16] },
    link: { body: `<path d="M16 1.5c1.2 8.4 4 12.6 14.5 14.5-10.5 1.9-13.3 6.1-14.5 14.5-1.2-8.4-4-12.6-14.5-14.5C12 14.1 14.8 9.9 16 1.5z" ${E}/>`, hot: [16, 16] },
  },
  {
    id: 'orb',
    name: 'Orb',
    arrow: { body: `<defs><radialGradient id="o" cx=".36" cy=".32" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#9a9a9a"/><stop offset="1" stop-color="#2a2a2a"/></radialGradient></defs><circle cx="16" cy="16" r="9.5" fill="url(#o)" stroke="S" stroke-width="1.5"/>`, hot: [16, 16] },
    link: { body: `<defs><radialGradient id="o" cx=".36" cy=".32" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#b5b5b5"/><stop offset="1" stop-color="#3a3a3a"/></radialGradient></defs><circle cx="16" cy="16" r="12.5" fill="url(#o)" stroke="S" stroke-width="1.5"/>`, hot: [16, 16] },
  },
  {
    id: 'bolt',
    name: 'Bolt',
    arrow: { body: `<path d="M18.5 2.5 7 18h7.2l-2 11.5L25 13h-7.5z" ${E}/>`, hot: [18, 3] },
    link: { body: `<path d="M19.5 1.5 6 18.4h7.6L11.5 30.5 26.5 12.6h-8z" ${E}/>`, hot: [19, 2] },
  },
  {
    id: 'heart',
    name: 'Heart',
    arrow: { body: `<path d="M16 27C7 20.6 4.5 16 4.5 11.6a6.3 6.3 0 0 1 11.5-3.5 6.3 6.3 0 0 1 11.5 3.5c0 4.4-2.5 9-11.5 15.4z" ${E}/>`, hot: [16, 14] },
    link: { body: `<path d="M16 29C6 21.7 3 16.6 3 11.6a7 7 0 0 1 13-3.7 7 7 0 0 1 13 3.7C29 16.6 26 21.7 16 29z" ${E}/>`, hot: [16, 15] },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    arrow: { body: `<path d="M16 3.5 27 16 16 28.5 5 16z" ${E}/>`, hot: [16, 16] },
    link: { body: `<path d="M16 1.5 29.5 16 16 30.5 2.5 16z" ${E}/><path d="M16 9.5 22.5 16 16 22.5 9.5 16z" fill="S"/>`, hot: [16, 16] },
  },
  {
    id: 'eye',
    name: 'Eye',
    arrow: { body: `<path d="M2.5 16C6 10 10.6 7.5 16 7.5s10 2.5 13.5 8.5C26 22 21.4 24.5 16 24.5S6 22 2.5 16z" ${E}/><circle cx="16" cy="16" r="4.6" fill="S"/>`, hot: [16, 16] },
    link: { body: `<path d="M1.5 16C5.2 9 10.4 6 16 6s10.8 3 14.5 10C26.8 23 21.6 26 16 26S5.2 23 1.5 16z" ${E}/><circle cx="16" cy="16" r="5.8" fill="S"/><circle cx="14.3" cy="14.3" r="1.6" fill="F"/>`, hot: [16, 16] },
  },
  {
    id: 'star',
    name: 'Star',
    arrow: { body: `<path d="M16 2.8l3.7 8.5 9.2.8-7 6 2.1 9L16 22.2 8 27.1l2.1-9-7-6 9.2-.8z" ${E}/>`, hot: [16, 15] },
    link: { body: `<path d="M16 1.6l4.1 9.4 10.2.9-7.7 6.7 2.3 10L16 23.2 7.1 28.6l2.3-10L1.7 11.9l10.2-.9z" ${E}/>`, hot: [16, 15] },
  },
  {
    id: 'moon',
    name: 'Moon',
    arrow: { body: `<path d="M21.5 4A12.5 12.5 0 1 0 28 21.5 10 10 0 0 1 21.5 4z" ${E}/>`, hot: [15, 16] },
    link: { body: `<path d="M21 2.5A14 14 0 1 0 29.5 21 11 11 0 0 1 21 2.5z" ${E}/>`, hot: [15, 16] },
  },
  {
    id: 'flame',
    name: 'Flame',
    arrow: { body: `<path d="M16 2.5c1 5 6.8 7.6 6.8 14a6.8 6.8 0 0 1-13.6 0c0-3 1.4-4.8 3-6.6.3 2 1.2 3.2 2.4 3.6C14.4 10.4 14.6 6.4 16 2.5z" ${E}/>`, hot: [16, 17] },
    link: { body: `<path d="M16 1.5c1.2 5.6 8 8.6 8 15.5a8 8 0 0 1-16 0c0-3.4 1.6-5.4 3.5-7.4.4 2.2 1.4 3.6 2.8 4C14.2 10.2 14.4 6 16 1.5z" ${E}/>`, hot: [16, 17] },
  },
  {
    id: 'crown',
    name: 'Crown',
    arrow: { body: `<path d="M4.5 24 6 10l6 6 4-9 4 9 6-6 1.5 14z" ${E}/><path d="M4.5 24.8h23v3h-23z" ${E}/>`, hot: [16, 16] },
    link: { body: `<path d="M3.5 23.5 5 8.5l6.6 6.6L16 5l4.4 10.1L27 8.5l1.5 15z" ${E}/><path d="M3.5 24.4h25v3.4h-25z" ${E}/>`, hot: [16, 16] },
  },
  {
    id: 'note',
    name: 'Note',
    arrow: { body: `<path d="M12.5 23.5V7l13-3v15.5" fill="none" stroke="S" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 23.5V7l13-3v15.5" fill="none" stroke="F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.3" cy="23.5" r="3.6" ${E}/><circle cx="22.3" cy="19.5" r="3.6" ${E}/>`, hot: [14, 6] },
    link: { body: `<path d="M12.5 23.5V7l13-3v15.5" fill="none" stroke="S" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 23.5V7l13-3v15.5" fill="none" stroke="F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.3" cy="23.5" r="4.6" ${E}/><circle cx="22.3" cy="19.5" r="4.6" ${E}/>`, hot: [14, 6] },
  },
  {
    id: 'plus',
    name: 'Plus',
    arrow: { body: stroke('M16 6v20M6 16h20'), hot: [16, 16] },
    link: { body: stroke('M16 3v26M3 16h26'), hot: [16, 16] },
  },
]
export const CURSOR_IDS = CURSORS.map((c) => c.id)

/** One SVG image for a cursor shape: white with a black edge, or black with a white edge. */
export function cursorSvg(shape: Shape, ink: 'white' | 'black', size: number) {
  const F = ink === 'white' ? '#ffffff' : '#000000'
  const S = ink === 'white' ? '#000000' : '#ffffff'
  const body = shape.body.replace(/"F"/g, `"${F}"`).replace(/"S"/g, `"${S}"`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${body}</svg>`
}

const css = (shape: Shape, ink: 'white' | 'black', size: number, fallback: string) => {
  const hx = Math.round((shape.hot[0] * size) / 32)
  const hy = Math.round((shape.hot[1] * size) / 32)
  return `url("data:image/svg+xml,${encodeURIComponent(cursorSvg(shape, ink, size))}") ${hx} ${hy}, ${fallback}`
}

/** The CSS `cursor` values for a preset: one for the page, one for links and buttons. */
export function cursorCss(id: string, ink: 'white' | 'black', size: number): { arrow: string; link: string } {
  const p = CURSORS.find((c) => c.id === id) ?? CURSORS[0]
  return { arrow: css(p.arrow, ink, size, 'auto'), link: css(p.link, ink, size, 'pointer') }
}

/** The CSS values for an uploaded picture (used on the page and on links alike). */
export function uploadCursorCss(uploadId: string, hot: 'tl' | 'center', size: number) {
  const o = hot === 'center' ? Math.round(size / 2) : 0
  const v = `url("${/^https:\/\//i.test(uploadId) ? uploadId : `/api/img/${uploadId}`}") ${o} ${o}, auto`
  return { arrow: v, link: v.replace(', auto', ', pointer') }
}
