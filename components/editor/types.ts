import type { BioConfig } from '@/lib/bio'
import type { BioStats } from '@/lib/bio-store'

export type ProfileDraft = { handle: string; name: string; bio: string; avatar: string | null; hasAvatar: boolean; /** an upload id waiting to be saved as the picture, or null to go back to the sign-in picture, or undefined for no change */ newAvatar?: string | null }

export type EditorApi = {
  cfg: BioConfig
  set: (f: (c: BioConfig) => BioConfig) => void
  /** shortcut: merge a patch into one section of the page */
  up: <K extends 'theme' | 'avatar' | 'bg' | 'overlay' | 'card' | 'audio' | 'cursor' | 'fx' | 'meta'>(k: K, patch: Partial<BioConfig[K]>) => void
  profile: ProfileDraft
  setProfile: (p: Partial<ProfileDraft>) => void
  stats: BioStats
  toast: (m: string) => void
}
