import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { BioPage } from '@/components/bio/bio-page'
import { BioPrivate } from '@/components/bio/bio-private'
import type { BioPageData } from '@/components/bio/context'
import { bioLookup } from '@/lib/bio-page'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

type Props = { params: Promise<{ slug: string; page: string }> }

/** logoless.io/<name>/<page> is another page of a person's site (About, Work, Contact...). */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const { slug, page } = await params
  const found = await bioLookup(decode(slug).toLowerCase()).catch(() => null)
  const sub = found?.data.config.pages?.find((p) => p.slug === decode(page).toLowerCase())
  if (!found || !sub) return { title: 'logoless', robots: { index: false, follow: false } }
  const title = `${sub.title} | ${found.data.name}`
  const description = found.data.config.meta.description || found.data.bio || `${found.data.name} on logoless`
  return {
    title,
    description,
    robots: found.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, type: 'profile', url: `https://logoless.io/${found.data.handle}/${sub.slug}` },
    alternates: { canonical: `https://logoless.io/${found.data.handle}/${sub.slug}` },
  }
}

export default async function Page({ params }: Props) {
  await connection()
  const { slug: rawSlug, page: rawPage } = await params
  const found = await bioLookup(decode(rawSlug).toLowerCase()).catch(() => null)
  if (!found || found.suspended) notFound()
  const sub = found.data.config.pages?.find((p) => p.slug === decode(rawPage).toLowerCase())
  if (!sub) notFound()
  const session = await getSession()
  let isOwner = false
  if (session?.user?.email) {
    const me = await (await db()).prepare('SELECT id FROM users WHERE email = ?1').bind(session.user.email.toLowerCase()).first<{ id: string }>()
    isOwner = me?.id === found.userId
  }
  const hidden = !isOwner && (found.visibility === 'private' || (found.visibility === 'members' && !session?.user?.email))
  if (hidden) return <BioPrivate handle={found.data.handle} kind={found.visibility === 'private' ? 'private' : 'members'} />
  const data: BioPageData = { ...found.data, current: sub.slug, config: { ...found.data.config, blocks: sub.blocks, free: sub.free } }
  return <BioPage data={data} mode="live" />
}
