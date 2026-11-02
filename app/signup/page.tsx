import { redirect } from 'next/navigation'
import { BioAuth } from '@/components/auth/bio-auth'
import { getSession } from '@/lib/session'

// Signing up is making a page: the name picked on the home page is carried through to the editor.
export default async function Page({ searchParams }: { searchParams: Promise<{ claim?: string }> }) {
  const { claim } = await searchParams
  if ((await getSession())?.user?.email) redirect(claim ? `/editor?claim=${encodeURIComponent(claim)}` : '/editor')
  return <BioAuth mode="signup" claim={claim ? claim.slice(0, 40).toLowerCase() : undefined} />
}
