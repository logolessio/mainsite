import { z } from 'zod'
import { HttpError } from './http'
import { checkRedirect } from './oauth'

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

