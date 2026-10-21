export const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const when = (t: number | null | undefined) => (t ? new Date(t * 1000).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '-')
