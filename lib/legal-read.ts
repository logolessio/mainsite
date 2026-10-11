import type { LegalDoc } from './legal'

/** About how long a document takes to read, at roughly 210 words a minute. */
export const readMinutes = (doc: LegalDoc) => Math.max(1, Math.round(doc.sections.flatMap((s) => s.p).join(' ').split(/\s+/).length / 210))
