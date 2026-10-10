import { getCloudflareContext } from '@opennextjs/cloudflare'
import { HttpError } from './http'

// Minimal Cloudflare D1 types, so the app does not need the full Workers type package.
export type D1Result<T = unknown> = { results: T[]; success: boolean; meta: { changes: number } }
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result>
}
export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
}

export async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true })
  const d = (env as { DB?: D1Database }).DB
  if (!d) throw new HttpError(503, 'The database is not set up yet.')
  return d
}

/** Reads a setting from the Worker bindings first, then process.env (local dev). */
export async function setting(name: string): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const v = (env as Record<string, unknown>)[name]
    if (typeof v === 'string' && v) return v
  } catch {
    /* not on Cloudflare */
  }
  return process.env[name]
}

export const nowSec = () => Math.floor(Date.now() / 1000)
export const uid = () => crypto.randomUUID()
