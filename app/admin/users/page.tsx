import { redirect } from 'next/navigation'

/** The old Users list is part of People now: one list, with the same filters, and every action on the person's own page. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; risk?: string }> }) {
  const sp = await searchParams
  const qs = new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.risk ? { f: 'risk' } : sp.f ? { f: sp.f } : {}) })
  redirect(`/admin/people${qs.size ? `?${qs}` : ''}`)
}
