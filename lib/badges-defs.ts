// Achievement definitions. Safe for the browser: no database code. `points` is how many points the star has.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type BadgeDef = { id: string; name: string; how: string; points: number; icon: string; rarity: Rarity }

export const BADGES: BadgeDef[] = [
  { id: 'first-clip', name: 'First cut', how: 'Submit your first clip', points: 5, icon: 'Clapperboard', rarity: 'common' },
  { id: 'clip-10', name: 'Ten deep', how: 'Submit 10 clips', points: 6, icon: 'Film', rarity: 'common' },
  { id: 'clip-50', name: 'Reel machine', how: 'Submit 50 clips', points: 8, icon: 'Layers', rarity: 'rare' },
  { id: 'clip-250', name: 'Unstoppable', how: 'Submit 250 clips', points: 12, icon: 'Flame', rarity: 'epic' },
  { id: 'first-approved', name: 'Approved', how: 'Get a clip approved', points: 5, icon: 'BadgeCheck', rarity: 'common' },
  { id: 'approved-25', name: 'Trusted cutter', how: 'Get 25 clips approved', points: 8, icon: 'Medal', rarity: 'rare' },
  { id: 'views-1k', name: 'Seen', how: 'Reach 1,000 verified views', points: 6, icon: 'Eye', rarity: 'common' },
  { id: 'views-100k', name: 'Signal boost', how: 'Reach 100,000 verified views', points: 9, icon: 'Radio', rarity: 'rare' },
  { id: 'views-1m', name: 'Million club', how: 'Reach 1,000,000 verified views', points: 12, icon: 'Crown', rarity: 'epic' },
  { id: 'first-earn', name: 'First payday', how: 'Earn your first payout', points: 6, icon: 'CircleDollarSign', rarity: 'common' },
  { id: 'earn-1k', name: 'Four figures', how: 'Earn $1,000 in total', points: 10, icon: 'Gem', rarity: 'rare' },
  { id: 'banner', name: 'Set the scene', how: 'Change your profile banner', points: 5, icon: 'Image', rarity: 'common' },
  { id: 'palette', name: 'Your colour', how: 'Pick your own dot colour', points: 5, icon: 'Palette', rarity: 'common' },
  { id: 'accent', name: 'Signature', how: 'Choose an accent colour', points: 5, icon: 'Droplet', rarity: 'common' },
  { id: 'typeface', name: 'Typeset', how: 'Change your profile font', points: 5, icon: 'Type', rarity: 'common' },
  { id: 'bio', name: 'In your words', how: 'Write a bio', points: 5, icon: 'PenLine', rarity: 'common' },
  { id: 'linked', name: 'Connected', how: 'Link a clipping account', points: 5, icon: 'Link2', rarity: 'common' },
  { id: 'collector', name: 'Collector', how: 'Favourite 5 campaigns', points: 6, icon: 'Heart', rarity: 'common' },
  { id: 'showcase', name: 'Showcase', how: 'Equip 5 badges on your profile', points: 7, icon: 'Star', rarity: 'rare' },
  { id: 'week', name: 'Settled in', how: 'Be a member for 7 days', points: 5, icon: 'Calendar', rarity: 'common' },
  { id: 'month', name: 'Regular', how: 'Be a member for 30 days', points: 8, icon: 'CalendarCheck', rarity: 'rare' },
  { id: 'founding', name: 'Founding member', how: 'Be one of the first 100 members', points: 12, icon: 'Sparkles', rarity: 'legendary' },
  { id: 'launched', name: 'Campaign live', how: 'Launch a campaign', points: 8, icon: 'Megaphone', rarity: 'rare' },
  { id: 'completionist', name: 'Completionist', how: 'Unlock 10 other badges', points: 12, icon: 'Trophy', rarity: 'epic' },
  { id: 'views-10m', name: 'Orbit', how: 'Reach 10,000,000 verified views', points: 20, icon: 'Rocket', rarity: 'legendary' },
  { id: 'earn-10k', name: 'Five figures', how: 'Earn $10,000 in total', points: 20, icon: 'Gem', rarity: 'legendary' },
  { id: 'clip-1000', name: 'Thousand cuts', how: 'Submit 1,000 clips', points: 20, icon: 'Zap', rarity: 'legendary' },
  { id: 'year', name: 'One year in', how: 'Be a member for a year', points: 15, icon: 'CalendarCheck', rarity: 'legendary' },
  { id: 'team', name: 'The team', how: 'Be part of the logoless team', points: 15, icon: 'ShieldCheck', rarity: 'legendary' },
]

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<string, BadgeDef>
export const MAX_EQUIPPED = 5
