// Shared labels for campaign states. `brand` is what the artist reads, `admin` is what the owner reads.
export const CAMPAIGN_STATUS: Record<string, { brand: string; admin: string; tone: 'good' | 'neutral' | 'warn' | 'bad' }> = {
  requested: { brand: 'Under review', admin: 'New request', tone: 'warn' },
  awaiting_payment: { brand: 'Approved: pay to launch', admin: 'Waiting for payment', tone: 'warn' },
  paid: { brand: 'Paid: launching soon', admin: 'Paid, ready to launch', tone: 'good' },
  live: { brand: 'Live', admin: 'Live', tone: 'good' },
  paused: { brand: 'Paused', admin: 'Paused', tone: 'neutral' },
  ended: { brand: 'Ended', admin: 'Ended', tone: 'neutral' },
  rejected: { brand: 'Not accepted', admin: 'Rejected', tone: 'bad' },
}
