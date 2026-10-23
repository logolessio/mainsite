// Safe for the browser and for middleware: no database, no secrets.

/** The address of the pre-launch sign-up. */
export const BETA_HOST = 'beta.logoless.io'
export const BETA_ONBOARDING = `https://${BETA_HOST}/onboarding`

/** beta.logoless.io, and beta.localhost on a developer's machine. `host` may include a port. */
export const isBetaHost = (host: string) => /^beta\.(?:logoless\.io|localhost)$/i.test(host.toLowerCase().split(':')[0])

/** Where the sign-in hop lives for this beta address: the main site (Google and Discord only send people back to logoless.io), or the local machine. */
export function joinBaseFor(host: string): string {
  const [name, port] = host.toLowerCase().split(':')
  return name.endsWith('.localhost') ? `http://localhost${port ? `:${port}` : ''}/join` : 'https://logoless.io/join'
}
