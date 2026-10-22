// The username-change rules and the words for them, with nothing server only in them so the profile screens can use them too.

export const HANDLE_CHANGES_PER_WEEK = 2
export const HANDLE_WINDOW_SEC = 7 * 24 * 3600

export type HandleChange = { at: number; from: string; to: string }

export type HandleQuota = {
  max: number
  used: number
  left: number
  /** When the next change is allowed (seconds since 1970), or null when one is allowed now. */
  nextAt: number | null
  /** The most recent change, so the field can say what the username used to be. */
  last: HandleChange | null
}

/** "3 days 4 hours", "5 hours 10 minutes": how long until a slot frees up, in words that do not depend on a time zone. */
export function waitWords(seconds: number) {
  const m = Math.max(1, Math.ceil(seconds / 60))
  const days = Math.floor(m / 1440)
  const hours = Math.floor((m % 1440) / 60)
  const mins = m % 60
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
  if (days > 0) return hours > 0 ? `${part(days, 'day')} ${part(hours, 'hour')}` : part(days, 'day')
  if (hours > 0) return mins > 0 && hours < 3 ? `${part(hours, 'hour')} ${part(mins, 'minute')}` : part(hours, 'hour')
  return part(mins, 'minute')
}

