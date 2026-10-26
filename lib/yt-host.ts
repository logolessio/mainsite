// Safe for the browser and for middleware: no database, no secrets.

/** The address of the Side Effects channel plan (app/yt). */
export const YT_HOST = 'yt.logoless.io'

/** yt.logoless.io, and yt.localhost on a developer's machine. `host` may include a port. */
export const isYtHost = (host: string) => /^yt\.(?:logoless\.io|localhost)$/i.test(host.toLowerCase().split(':')[0])
