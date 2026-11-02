import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Editor } from '@/components/editor/editor'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Editor | logoless', robots: { index: false, follow: false } }

/** Where a person builds their page: the live preview, the links and every look. Needs a login (and sends you to it, then back here). */
export default async function Page({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  if (!(await getSession())?.user?.email) redirect('/login?next=/editor')
  const q = await searchParams
  const claim = q.claim ? q.claim.slice(0, 40).toLowerCase() : null
  return <Editor claim={claim} />
}
