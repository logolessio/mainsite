import { discordOverview } from '@/lib/discord/overview'
import { featureOn } from '@/lib/features'
import { HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** The Discord page in the dashboard: account, roles, server invite. */
export const GET = route(async () => {
  const user = await requireUser()
  if (!(await featureOn('discord-page'))) throw new HttpError(404, 'Not found.')
  return json(await discordOverview(user.id))
})
