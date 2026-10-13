import { type Role, confirmSignup, resendSignupCode } from './auth'
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
  avatar: string | null // a preview address
  avatarKey: string | null // the stored picture's id
  // socials: platform -> verified handle
  linked: Partial<Record<SocialPlatform, string>>
  // interests
  niches: string[]
  styles: string[]
  notifyCampaigns: boolean
  notifyPayouts: boolean
  // payouts / billing
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
  avatarKey: null,
  linked: {},
  niches: [],
  styles: [],
  notifyCampaigns: true,
  notifyPayouts: true,
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

/** Asks the server whether a username is free. */
export async function checkHandleAvailable(handle: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/me/handle?h=${encodeURIComponent(handle)}`, { cache: 'no-store' })
    if (!res.ok) return true // the real check happens again when the profile is saved
    return ((await res.json()) as { available: boolean }).available
  } catch {
    return true
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  try {
    await confirmSignup(email, code)
    return true
  } catch {
    return false
  }
}

export async function resendEmailCode(email: string): Promise<void> {
  await resendSignupCode(email)
}

/** Saves what the person told us as their real profile. Throws with a readable message if it cannot. */
export async function completeOnboarding(data: OnboardingData): Promise<void> {
  const res = await fetch('/api/me/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      role: data.role,
      name: data.name,
      handle: data.handle,
      bio: data.bio,
      country: data.country,
      avatarKey: data.avatarKey,
      linked: data.linked,
      niches: data.niches,
      company: data.company,
      website: data.website,
      industry: data.industry,
      goals: data.goals,
      budget: data.budget,
    }),
  })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save your profile.')
}
