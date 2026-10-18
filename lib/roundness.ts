// How round the whole site is. One number from 0 to 150 (set on Site, Design): 100 is the look the site has always had,
// 0 is square corners, and above 100 the panels get rounder still. Buttons and fields stay fully pill-shaped from 100 up.
// The number becomes two CSS variables on <html>: --round (how much every corner radius is scaled) and --pill (the radius of
// anything that is a pill or a circle). Nothing is set at 100, so the site looks exactly as it did before.

export const ROUND_MIN = 0
export const ROUND_MAX = 150
export const ROUND_DEFAULT = 100

export const ROUND_PRESETS: { id: string; label: string; value: number }[] = [
  { id: 'sharp', label: 'Sharp', value: 0 },
  { id: 'crisp', label: 'Crisp', value: 25 },
  { id: 'soft', label: 'Soft', value: 55 },
  { id: 'standard', label: 'Standard', value: 100 },
  { id: 'extra', label: 'Extra round', value: 150 },
]

export const parseRoundness = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10)
  if (!Number.isFinite(n)) return ROUND_DEFAULT
  return Math.min(ROUND_MAX, Math.max(ROUND_MIN, Math.round(n)))
}

/** The two variables for a roundness value, or nothing at all for the standard look. */
export function roundnessVars(value: number): Record<string, string> {
  const v = parseRoundness(value)
  if (v === ROUND_DEFAULT) return {}
  return { '--round': String(+(v / 100).toFixed(3)), '--pill': v > ROUND_DEFAULT ? '9999px' : `${+((v / 100) * 32).toFixed(2)}px` }
}
