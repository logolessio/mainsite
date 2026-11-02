import { RESERVED_SLUGS } from './invite-shared'

/** The pages of the link-in-bio product that stand on their own, with none of the older site around them. */
export const BIO_APP_PATHS = ['/editor', '/login', '/signup', '/forgot-password', '/claim']

/**
 * Is this path one of the link-in-bio surfaces: the home page, the editor, signing in, or a person's page (logoless.io/<name>: one segment that is not a
 * name the site uses itself)? Safe in the browser and in middleware.
 */
export function isBioSurface(path: string): boolean {
  if (path === '/') return true
  if (BIO_APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return true
  const m = /^\/([^/]+)\/?$/.exec(path)
  if (!m) return false
  let seg = m[1]
  try {
    seg = decodeURIComponent(seg)
  } catch {
    /* use it as it is */
  }
  return !seg.startsWith('@') && !RESERVED_SLUGS.has(seg.toLowerCase())
}
