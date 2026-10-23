import { launchView } from '../launch'
import { allSettings } from '../settings'
import { notice } from './look'

/** The "not live yet" line for the welcome and setup messages while the launch page is up, and null once the site is open. */
export async function launchNotice(): Promise<string | null> {
  try {
    const v = launchView(await allSettings())
    return v.closed ? notice(v.end) : null
  } catch {
    return null
  }
}
