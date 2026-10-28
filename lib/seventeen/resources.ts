/**
 * The free editing resources on 17.logoless.io/resources: text animations, overlays and colour presets. Each one is drawn as a small moving
 * preview by components/seventeen/resource-library.tsx (no pictures needed). Like the packs, these are SAMPLES: give each its real `url`
 * once the file is up; without one its button opens the Discord.
 */

export type ResourceTab = 'Text animations' | 'Overlays' | 'Colour presets'

export type Resource = {
  name: string
  tab: ResourceTab
  tag: string
  /** what the preview shows: an animation for text, a light for overlays, two colours for presets */
  look: { kind: 'text'; motion: 'blur' | 'rise' | 'type' | 'scale' | 'slide' | 'flicker' } | { kind: 'overlay'; colour: string } | { kind: 'grade'; from: string; to: string }
  url?: string
}

const text = (name: string, tag: string, motion: 'blur' | 'rise' | 'type' | 'scale' | 'slide' | 'flicker'): Resource => ({ name, tab: 'Text animations', tag, look: { kind: 'text', motion } })
const overlay = (name: string, tag: string, colour: string): Resource => ({ name, tab: 'Overlays', tag, look: { kind: 'overlay', colour } })
const grade = (name: string, tag: string, from: string, to: string): Resource => ({ name, tab: 'Colour presets', tag, look: { kind: 'grade', from, to } })

export const RESOURCES: Resource[] = [
  text('Blur 01', 'Blur', 'blur'),
  text('Blur 02', 'Blur', 'blur'),
  text('Rise 01', 'Position', 'rise'),
  text('Rise 02', 'Position', 'rise'),
  text('Typewriter', 'Code', 'type'),
  text('Punch in', 'Scale', 'scale'),
  text('Punch out', 'Scale', 'scale'),
  text('Slide left', 'Position', 'slide'),
  text('Glitch flicker', 'Colourful', 'flicker'),
  text('Soft flicker', 'Colourful', 'flicker'),
  overlay('Light leak red', 'Light leaks', '#ff1f38'),
  overlay('Light leak violet', 'Light leaks', '#9650ff'),
  overlay('Anamorphic blue', 'Flares', '#4678ff'),
  overlay('Anamorphic gold', 'Flares', '#ffc857'),
  overlay('Film burn', 'Light leaks', '#ff8a3d'),
  overlay('Teal haze', 'Haze', '#2ed0b0'),
  grade('Midnight', 'Cool', '#0d1b3d', '#4ba9dc'),
  grade('Ember', 'Warm', '#3a0a05', '#ff8a3d'),
  grade('Rose film', 'Warm', '#2c0d1d', '#ffb3c7'),
  grade('Matrix', 'Cool', '#03140a', '#2ed0b0'),
  grade('Bleach', 'Neutral', '#1a1a1a', '#ededed'),
  grade('Signal', 'Bold', '#140003', '#ff1f38'),
]

export const RESOURCE_TABS: ResourceTab[] = ['Text animations', 'Overlays', 'Colour presets']
