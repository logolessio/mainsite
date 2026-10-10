import type { Role } from './auth'
import type { SocialPlatform } from './accounts'

// UI-only stubs for the onboarding flow. Each function is a seam for your backend.

export type OnboardingData = {
  role: Role
  method: 'discord' | 'google' | 'email' | null
  email: string
  accountCreated: boolean
  terms: boolean
  // clipper profile
  name: string
  handle: string
  bio: string
  country: string
  avatar: string | null // object URL, never persisted
  // socials: platform -> verified handle
  linked: Partial<Record<SocialPlatform, string>>
  // interests
  niches: string[]
  styles: string[]
  notifyCampaigns: boolean
  notifyPayouts: boolean
  // payouts / billing
  stripeConnected: boolean
  fundAmount: number | null
  // brand
  company: string
  website: string
  industry: string
  goals: string[]
  budget: string
  logo: string | null
}

export const DEFAULT_DATA: OnboardingData = {
  role: 'clipper',
  method: null,
  email: '',
  accountCreated: false,
  terms: false,
  name: '',
  handle: '',
  bio: '',
  country: '',
  avatar: null,
  linked: {},
  niches: [],
  styles: [],
  notifyCampaigns: true,
  notifyPayouts: true,
  stripeConnected: false,
  fundAmount: null,
  company: '',
  website: '',
  industry: '',
  goals: [],
  budget: '',
  logo: null,
}

export const NICHES = ['Music', 'Streamers', 'Podcasts', 'Sports', 'Gaming', 'Comedy', 'Fashion', 'Brands & products', 'Film & TV', 'Education']
export const STYLES = ['Fan edits', 'Live-stream highlights', 'Cinematic', 'Meme / comedy', 'Lyric & visualiser', 'Captioned talking clips']
export const GOALS = ['Promote a release', 'Grow a streamer', 'Launch a product', 'Drive event ticket sales', 'Build brand awareness', 'Test content ideas']
export const INDUSTRIES = ['Music label or artist', 'Streamer or creator', 'Podcast', 'Sports or events', 'Consumer brand', 'Agency', 'Other']
export const BUDGETS = ['Under $500', '$500 – $2,500', '$2,500 – $10,000', '$10,000+']
export const COUNTRIES = ['United States', 'United Kingdom', 'Canada', 'Australia', 'Ireland', 'Germany', 'France', 'Netherlands', 'Spain', 'Singapore', 'Other']
export const FUND_PRESETS = [250, 500, 1000, 5000]

const RESERVED = new Set(['admin', 'logoless', 'support', 'root', 'staff', 'help', 'api'])

export async function checkHandleAvailable(handle: string): Promise<boolean> {
  // TODO(backend): GET /api/handles/:handle
  await new Promise((r) => setTimeout(r, 450))
  return !RESERVED.has(handle.toLowerCase())
}

export async function verifyEmailCode(_email: string, code: string): Promise<boolean> {
  // TODO(backend): POST /api/auth/verify-email { email, code }. Preview accepts any 6 digits.
  await new Promise((r) => setTimeout(r, 600))
  return /^\d{6}$/.test(code)
}

export async function resendEmailCode(_email: string): Promise<void> {
  // TODO(backend): POST /api/auth/resend-code
  await new Promise((r) => setTimeout(r, 300))
}

export async function completeOnboarding(_data: OnboardingData): Promise<void> {
  // TODO(backend): PUT /api/me/onboarding. Persist the profile, interests and brand details, then set onboarded = true.
  await new Promise((r) => setTimeout(r, 400))
}
