/**
 * Songs a person uploads. They are kept as pieces in the uploads table (lib/chunks.ts), so there is no limit per song: only the person's 50 MB.
 */
export const AUDIO_MIMES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/flac'] as const

/** The real type, read from the first bytes. What the browser says the file is does not count. */
export function sniffAudio(b: Uint8Array): (typeof AUDIO_MIMES)[number] | null {
  const s = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (s(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  if (s(4, 8) === 'ftyp') return 'audio/mp4'
  if (s(0, 4) === 'OggS') return 'audio/ogg'
  if (s(0, 4) === 'fLaC') return 'audio/flac'
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav'
  return null
}
