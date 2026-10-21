import { getPage, launchView } from './launch'
import type { PageMode } from './launch-page'
import { ownerEmails } from './roles'
import { getSession } from './session'
import { allSettings } from './settings'
import { getLinks } from './socials-db'

/** Everything the coming-soon and links page needs from the server. `view` lets anyone look at either state (?view=soon or ?view=live). */
export async function launchHomeData(view?: string | string[]) {
  const [s, page, items, session, owners] = await Promise.all([allSettings(), getPage(), getLinks(), getSession(), ownerEmails()])
  const v = launchView(s)
  const email = session?.user?.email?.toLowerCase() ?? null
  const mode: PageMode = view === 'soon' || view === 'live' ? view : v.closed ? 'soon' : 'live'
  return {
    mode,
    headline: v.headline,
    text: v.text,
    end: v.end,
    page,
    items,
    // the owner (ADMIN_EMAILS) and admins can edit the page; the save routes check again
    isOwner: Boolean(email && (owners.includes(email) || session?.user?.role === 'admin')),
    signedInAs: email,
  }
}
