import { redirect } from 'next/navigation'

// Sign-up now lives inside the guided onboarding flow.
export default async function Page({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams
  redirect(role ? `/onboarding?role=${encodeURIComponent(role)}` : '/onboarding')
}
