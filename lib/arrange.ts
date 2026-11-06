// Turning a page that is laid out by a layout (Classic, Card, Cover...) into free pieces without moving anything: every piece of the page has a
// `data-bk` mark, so where each one is on screen is read from the page itself and put into the canvas's 390 wide world, in the same proportions.
import { FREE_W, type FreeBox } from './bio'

/** Where every marked piece of the page in `root` sits, as canvas boxes. `align` is how the text in the layout was set. Null if nothing could be read. */
export function measureFlow(root: HTMLElement, align: 'l' | 'c'): Record<string, FreeBox> | null {
  const seen = new Set<string>()
  const items: { key: string; r: { left: number; top: number; width: number; height: number } }[] = []
  for (const el of root.querySelectorAll<HTMLElement>('[data-bk]')) {
    const key = el.dataset.bk ?? ''
    if (!key || seen.has(key)) continue
    let r = el.getBoundingClientRect()
    let box = { left: r.left, top: r.top, width: r.width, height: r.height }
    if (key === 'name') {
      // the name is as wide as its letters, not as wide as the line it sits on
      const range = document.createRange()
      range.selectNodeContents(el)
      const t = range.getBoundingClientRect()
      if (t.width > 4) box = { left: t.left, top: r.top, width: t.width, height: r.height }
    }
    if (box.width < 2 || box.height < 2) continue
    seen.add(key)
    items.push({ key, r: box })
  }
  const pieces = items.filter((i) => i.key !== 'card')
  if (!pieces.length) return null
  const left = Math.min(...pieces.map((i) => i.r.left))
  const right = Math.max(...pieces.map((i) => i.r.left + i.r.width))
  const top = Math.min(...pieces.map((i) => i.r.top))
  const span = Math.max(right - left, 1)
  const s = Math.min(1.4, 326 / span)
  const offX = (FREE_W - span * s) / 2
  const r1 = (n: number) => Math.round(n * 10) / 10
  const out: Record<string, FreeBox> = {}
  for (const { key, r } of items) {
    const box: FreeBox = { x: r1(offX + (r.left - left) * s), y: r1(44 + (r.top - top) * s), w: r1(Math.max(14, r.width * s)) }
    if (key === 'card') box.h = r1(r.height * s)
    if (key === 'bio' || key === 'name') box.a = align
    else if (key !== 'avatar' && key !== 'card') box.a = align
    out[key] = box
  }
  // the name's letters follow its width, so keep it from being a sliver
  if (out.name) out.name.w = r1(Math.max(out.name.w, 60))
  return out
}
