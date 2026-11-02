import { RESERVED_SLUGS } from './invite-shared'

/** A name the site itself uses (a page, a folder of files, a route): nobody can have it as logoless.io/<name>. */
export const bioHandleReserved = (h: string) => RESERVED_SLUGS.has(h.toLowerCase())
