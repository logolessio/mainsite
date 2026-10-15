import { cache } from 'react'
import { featureState } from './features'
import { getSetting } from './settings'
import { getSession } from './session'

/**
 * Mock campaigns are made-up campaigns an admin creates to try the site: to test the browse page, the campaign sheet, clip
 * submissions and the review flow without a real brand. They have no brand and no money, can never pay anyone, and are only
 * shown to the team and on the dev site, unless an admin chooses to show them to everyone. Their ids all start with "mock-".
 */
export const MOCK_PREFIX = 'mock-'
export const isMockId = (id: string) => id.startsWith(MOCK_PREFIX)
export const NOT_MOCK = `id NOT LIKE '${MOCK_PREFIX}%'`

/** Can the person making this request see mock campaigns? The team always can, the dev site always shows them, and an admin switch shows them to all. */
export const mockVisible = cache(async (): Promise<boolean> => {
  try {
    if ((await getSetting('mock_public')) === '1') return true
    if ((await featureState()).dev) return true
    const roles = (await getSession())?.user?.roles ?? []
    return roles.includes('admin') || roles.includes('dev')
  } catch {
    return false
  }
})
