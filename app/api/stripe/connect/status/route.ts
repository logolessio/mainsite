import { connectStatus } from '@/lib/connect'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** Asks Stripe for the live state of the clipper's account: what is done, what is still needed, and why anything failed. */
export const GET = route(async () => json(await connectStatus(await requireUser())))
