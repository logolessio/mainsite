import { z } from 'zod'
import { HttpError } from './http'
import { checkRedirect } from './oauth'
import { type AppDraft, checkRedirectUri, draftProblems } from './dev-app-rules'

export const appInput = z.object({
  name: z.string().trim().min(2, 'Give the app a name.').max(40),
  description: z.string().trim().max(200).default(''),
  website: z.string().trim().max(200).default(''),
  redirectUris: z.array(z.string().trim().max(300)).min(1, 'Add at least one return address.').max(10),
  type: z.enum(['confidential', 'public']),
})

export function cleanInput(a: z.infer<typeof appInput>) {
  const uris = [...new Set(a.redirectUris.map((u) => checkRedirect(u)))]
  if (uris.some((u) => !u)) throw new HttpError(400, 'Return addresses must be https (or http://localhost for testing), with no wildcards and no #.')
  let website = ''
  if (a.website) {
    try {
      const u = new URL(a.website)
      if (u.protocol !== 'https:') throw new Error('x')
      website = u.toString()
    } catch {
      throw new HttpError(400, 'The website must start with https://')
    }
  }
  return { name: a.name, description: a.description, website, redirectUris: uris as string[], type: a.type }
}


// ---------- the developer tools form (feature "developer-tools") ----------
// The same rules the form shows as you type (lib/dev-app-rules.ts), checked again here, because the form is only a form.

export const appInputV2 = z.object({
  name: z.string().max(200),
  description: z.string().max(400),
  website: z.string().max(400).default(''),
  kind: z.string().max(40),
  type: z.enum(['confidential', 'public']),
  useCases: z.array(z.string().max(40)).max(20),
  useDescription: z.string().max(2000),
  redirectUris: z.array(z.string().max(400)).max(20),
  privacyUrl: z.string().max(400).default(''),
  termsUrl: z.string().max(400).default(''),
})

export type AppInputV2 = z.infer<typeof appInputV2>

/** Either the cleaned app, or the problem with each field. */
export function cleanInputV2(a: AppInputV2): { ok: ReturnType<typeof cleanV2> } | { fields: Partial<Record<keyof AppDraft, string>> } {
  const draft: AppDraft = { ...a, redirectUris: a.redirectUris.map((u) => u.trim()).filter(Boolean) }
  const fields = draftProblems(draft)
  if (Object.keys(fields).length) return { fields }
  return { ok: cleanV2(draft) }
}

function cleanV2(d: AppDraft) {
  const uris = [...new Set(d.redirectUris.map((u) => (checkRedirectUri(u, d.type) as { ok: string }).ok))]
  const url = (s: string) => (s.trim() ? new URL(s.trim()).toString() : '')
  return {
    name: d.name.trim().replace(/\s+/g, ' '),
    description: d.description.trim().replace(/\s+/g, ' '),
    website: url(d.website),
    redirectUris: uris,
    type: d.type,
    kind: d.kind,
    useCases: [...new Set(d.useCases)],
    useDescription: d.useDescription.trim(),
    privacyUrl: url(d.privacyUrl),
    termsUrl: url(d.termsUrl),
  }
}
