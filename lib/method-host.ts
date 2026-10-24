// Safe for the browser and for middleware: no database, no secrets.

/** The address of Motion4K Optimizer, the video patcher (app/method). */
export const METHOD_HOST = 'method.logoless.io'

/** method.logoless.io, and method.localhost on a developer's machine. `host` may include a port. */
export const isMethodHost = (host: string) => /^method\.(?:logoless\.io|localhost)$/i.test(host.toLowerCase().split(':')[0])
