/** What the N key does in each area: the one thing a person most often sets out to do. */
export const PRIMARY: Record<string, { href: string; label: string } | undefined> = {
  Creator: { href: '/', label: 'Find a campaign' },
  Brand: { href: '/brand/campaigns/new', label: 'Start a campaign' },
}
