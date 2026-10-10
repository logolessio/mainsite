import { setting } from '@/lib/db'
import { json, route } from '@/lib/http'

/** The public half of the Turnstile key, so the browser can show the check. Safe to expose. */
export const GET = route(async () => json({ turnstileSiteKey: (await setting('TURNSTILE_SITE_KEY')) ?? null }))
