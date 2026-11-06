import type { BioConfig } from '@/lib/bio'
import type { BioStats } from '@/lib/bio-store'

export type ProfileDraft = { handle: string; name: string; bio: string; avatar: string | null; hasAvatar: boolean; /** an upload id waiting to be saved as the picture, or null to go back to the sign-in picture, or undefined for no change */ newAvatar?: string | null }

export type EditorApi = {
  cfg: BioConfig
  set: (f: (c: BioConfig) => BioConfig) => void
  /** shortcut: merge a patch into one section of the page */
  up: <K extends 'colors' | 'theme' | 'avatar' | 'bg' | 'overlay' | 'card' | 'audio' | 'vis' | 'lyrics' | 'cursor' | 'fx' | 'meta'>(k: K, patch: Partial<BioConfig[K]>) => void
  profile: ProfileDraft
  setProfile: (p: Partial<ProfileDraft>) => void
  stats: BioStats
  toast: (m: string) => void
  /** the canvas layout: which piece is selected, and whether dragging lines things up */
  sel: string | null
  setSel: (k: string | null) => void
  snap: boolean
  setSnap: (v: boolean) => void
  /** turn the page into free pieces you can drag and resize (true), or go back to the layout it came from (false) */
  dragMode: (on: boolean) => void
  /** which page of the site is being edited (its id), or empty for the home page */
  page: string
  setPage: (id: string) => void
  /** add, change, move or remove an extra page; each answers with the page that should be shown after */
  pages: {
    add: (title: string) => string
    patch: (id: string, p: { title?: string; slug?: string }) => void
    move: (id: string, dir: -1 | 1) => void
    remove: (id: string) => void
  }
}
