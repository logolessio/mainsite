import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Privacy | logoless', robots: { index: false } }

/** Privacy is a section of the profile settings now. Old links and bookmarks land there, with the window open. */
export default function Page() {
  redirect('/dashboard/profile#privacy')
}
