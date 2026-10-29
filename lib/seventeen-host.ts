// Safe for the browser and for middleware: no database, no secrets.

/** The address of 17, the scenepack site (app/seventeen). */
export const SEVENTEEN_HOST = '17.logoless.io'

/** 17.logoless.io, and 17.localhost on a developer's machine. `host` may include a port. */
export const isSeventeenHost = (host: string) => /^17\.(?:logoless\.io|localhost)$/i.test(host.toLowerCase().split(':')[0])

/** The pages 17 has, as visitors see them. Every other path on its address comes back to the home page. */
export const isSeventeenPath = (p: string) => p === '/' || p === '/request' || /^\/p\/[a-z0-9-]+$/.test(p)
