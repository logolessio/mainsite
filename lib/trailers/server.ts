import { HttpError } from '../http'
import { getSession } from '../session'
import { loadProfile } from './store'
import { REGIONS } from './types'

/** The signed-in person's email, or a 401. */
export async function requireEmail(): Promise<string> {
  const email = (await getSession())?.user?.email?.toLowerCase()
  if (!email) throw new HttpError(401, 'Sign in first.')
  return email
}

export async function currentProfile() {
  const email = (await getSession())?.user?.email?.toLowerCase() ?? null
  return { email, profile: email ? await loadProfile(email) : null }
}

/** Where in the world the request comes from, as one of the countries the site knows about (Cloudflare tells us). */
export function regionOf(req: Request): string {
  const c = (req.headers.get('cf-ipcountry') ?? '').toUpperCase()
  return REGIONS.some(([code]) => code === c) ? c : 'US'
}

export const noCatalogue = () => new HttpError(503, 'The movie catalogue is not connected yet.')
