/** A campaign's end date as saved ("14/12/2026", an older "Dec 14", or nothing) read back as a time, or null when there is none to read. */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export function parseEnds(s: string | null | undefined, now = new Date()): number | null {
  if (!s) return null
  const uk = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (uk) return Date.UTC(Number(uk[3]), Number(uk[2]) - 1, Number(uk[1]), 23, 59, 59) / 1000
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 23, 59, 59) / 1000
  const old = /^([A-Za-z]{3})[a-z]* (\d{1,2})$/.exec(s.trim())
  if (old) {
    const m = MONTHS.indexOf(old[1].toLowerCase())
    if (m < 0) return null
    // an older value has no year: take the next time that day comes round
    let y = now.getUTCFullYear()
    let t = Date.UTC(y, m, Number(old[2]), 23, 59, 59)
    if (t < now.getTime() - 30 * 86400000) t = Date.UTC(++y, m, Number(old[2]), 23, 59, 59)
    return t / 1000
  }
  return null
}
