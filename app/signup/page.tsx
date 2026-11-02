import { redirect } from 'next/navigation'
import { BioAuth } from '@/components/auth/bio-auth'
import { featureOn } from '@/lib/features'
import { getSession } from '@/lib/session'

// With the link-in-bio switch on, signing up is making a page: the name picked on the home page is carried through to the editor.
// Otherwise sign-up lives inside the guided onboarding flow.
export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string; claim?: string }> }) {
  const { role, claim } = await searchParams
  if (await featureOn('bio-site')) {
    if ((await getSession())?.user?.email) redirect(claim ? `/editor?claim=${encodeURIComponent(claim)}` : '/editor')
    return <BioAuth mode="signup" claim={claim ? claim.slice(0, 40).toLowerCase() : undefined} />
  }
  redirect(role ? `/onboarding?role=${encodeURIComponent(role)}` : '/onboarding')
}
