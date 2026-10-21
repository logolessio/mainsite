import { RESERVED_SLUGS, SLUG_RE } from './invite-shared'

/**
 * Client links on their own address: kxng.logoless.io is the same private page as logoless.io/kxng. Safe for the browser and
 * for middleware: no database, no secrets.
 *
 * The site's own addresses (dev, owner, admin, scroll, www and the rest below) are never a client. On the dev site a client
 * address is kxng.dev.logoless.io, and on a computer kxng.localhost:3000 behaves the same way, so it can be tried locally.
 */
const OWN = new Set(['www', 'dev', 'admin', 'owner', 'scroll', 'api', 'mail', 'email', 'verify', 'status', 'cdn', 'assets', 'static', 'app', 'docs', 'staging', 'preview', 'beta', 'm', 'ns1', 'ns2', 'smtp', 'go', 'link', 'links'])

export type ClientHost = { slug: string; /** the main site this address belongs to, without a trailing slash */ main: string }

/** The client's link name when this address is a client address, otherwise null. `host` may include a port. */
export function clientSlugOf(host: string): ClientHost | null {
  const [name, port] = host.toLowerCase().split(':')
  const m = /^([a-z0-9-]+)\.(dev\.)?logoless\.io$/.exec(name) ?? /^([a-z0-9-]+)\.localhost$/.exec(name)
  if (!m) return null
  const slug = m[1]
  if (OWN.has(slug) || RESERVED_SLUGS.has(slug) || !SLUG_RE.test(slug)) return null
  const main = name.endsWith('.localhost') ? `http://localhost${port ? `:${port}` : ''}` : m[2] ? 'https://dev.logoless.io' : 'https://logoless.io'
  return { slug, main }
}

/** The pretty address of a client link, e.g. https://kxng.logoless.io */
export const clientUrl = (slug: string, dev = false) => `https://${slug}.${dev ? 'dev.' : ''}logoless.io`
export const clientHostName = (slug: string) => `${slug}.logoless.io`
