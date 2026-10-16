/** "3 days ago", "2 months ago": how long ago something happened, in words. `at` is a unix time in seconds. */
export function agoText(at: number, now = Math.floor(Date.now() / 1000)) {
  const s = Math.max(0, now - at)
  const unit = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'} ago`
  if (s < 90) return 'just now'
  if (s < 3600) return unit(Math.round(s / 60), 'minute')
  if (s < 86400) return unit(Math.round(s / 3600), 'hour')
  if (s < 14 * 86400) return unit(Math.round(s / 86400), 'day')
  if (s < 60 * 86400) return unit(Math.round(s / (7 * 86400)), 'week')
  if (s < 730 * 86400) return unit(Math.round(s / (30.4 * 86400)), 'month')
  return unit(Math.round(s / (365 * 86400)), 'year')
}
