import { notFound } from 'next/navigation'
import { featureOn } from './features'

/** The Developer section of the dashboard is part of the developer tools. */
export async function requireDeveloperTools() {
  if (!(await featureOn('developers')) || !(await featureOn('developer-tools'))) notFound()
}
