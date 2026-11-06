import { type LyricLine, MAX_LYRIC_LINES } from './bio'

/** Lyrics in the LRC format ("[01:02.34] words") to lines with a start time in milliseconds. A line may carry several times (a repeated chorus). */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = []
  for (const raw of lrc.split(/\r?\n/)) {
    const times = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)]
    if (!times.length) continue
    const words = raw.replace(/\[[^\]]*\]/g, '').trim()
    for (const m of times) {
      const t = Math.round((Number(m[1]) * 60 + Number(m[2].replace(':', '.'))) * 1000)
      if (Number.isFinite(t)) out.push({ t, x: words.slice(0, 200) })
    }
  }
  return out.sort((a, b) => a.t - b.t).slice(0, MAX_LYRIC_LINES)
}

/** Lyrics with no times: spread evenly over the song, leaving the first and last few seconds quiet. */
export function spreadPlain(plain: string, durationSec: number): LyricLine[] {
  const lines = plain.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_LYRIC_LINES)
  if (!lines.length) return []
  const start = Math.min(8000, durationSec * 80)
  const span = Math.max(1000, durationSec * 1000 - start - 6000)
  return lines.map((x, i) => ({ t: Math.round(start + (i / lines.length) * span), x: x.slice(0, 200) }))
}

/** Which line is being sung at `ms`: the last one that has started, or -1 before the first. */
export function lineAt(lines: LyricLine[], ms: number) {
  let lo = 0
  let hi = lines.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].t <= ms) {
      ans = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return ans
}

export type LyricHit = { id: number; track: string; artist: string; album: string; duration: number; synced: boolean; instrumental: boolean }
