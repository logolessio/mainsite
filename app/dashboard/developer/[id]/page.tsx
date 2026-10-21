import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppDetail } from '@/components/developers/dashboard'
import { requireDeveloperTools } from '@/lib/dev-dashboard'
import { appPublic, appUsage, getApp } from '@/lib/oauth'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Your app | logoless', robots: { index: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireDeveloperTools()
  const user = await pageUser()
  const { id } = await params
  const app = await getApp(id)
  if (!app || app.ownerId !== user.id) notFound()
  return <AppDetail app={{ ...appPublic(app), usage: await appUsage(app.id) }} />
}
