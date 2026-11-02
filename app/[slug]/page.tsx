import type { Metadata } from 'next'
import { connection } from 'next/server'
import { BioFree } from '@/components/bio/bio-free'
import { BioPage } from '@/components/bio/bio-page'
import { BioPrivate } from '@/components/bio/bio-private'
import { bioLookup } from '@/lib/bio-page'
import { bioHandleReserved } from '@/lib/bio-reserved'
import { db } from '@/lib/db'
import { handleProblem } from '@/lib/profile-style'
import { getSession } from '@/lib/session'

const FREE_META: Metadata = { title: 'logoless', robots: { index: false, follow: false } }

const decode = (s: string) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** logoless.io/<name> is a person's link-in-bio page. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  await connection()
  const handle = decode((await params).slug).toLowerCase()
  const found = await bioLookup(handle).catch(() => null)
  if (!found) return FREE_META
  const c = found.data.config
  const title = c.meta.title || `${found.data.name} (${found.data.handle})`
  const description = c.meta.description || found.data.bio || `${found.data.name} on logoless`
  return {
    title,
    description,
    robots: found.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title, description, type: 'profile', url: `https://logoless.io/${found.data.handle}` },
    twitter: { card: 'summary', title, description },
    alternates: { canonical: `https://logoless.io/${found.data.handle}` },
  }
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }

export default async function Page({ params, searchParams }: Props) {
  await connection()
  const { slug: raw } = await params
  const q = await searchParams
  const slug = decode(raw).toLowerCase()
  const found = await bioLookup(slug).catch(() => null)
  const session = await getSession()
  if (found && !found.suspended) {
    let isOwner = false
    if (session?.user?.email) {
      const me = await (await db()).prepare('SELECT id FROM users WHERE email = ?1').bind(session.user.email.toLowerCase()).first<{ id: string }>()
      isOwner = me?.id === found.userId
    }
    const hidden = !isOwner && (found.visibility === 'private' || (found.visibility === 'members' && !session?.user?.email))
    if (hidden) return <BioPrivate handle={found.data.handle} kind={found.visibility === 'private' ? 'private' : 'members'} />
    return <BioPage data={found.data} mode={isOwner && q.preview === '1' ? 'preview' : 'live'} />
  }
  // nobody has this name: it is offered to the visitor (or, for a name the site keeps or that is not a name, said so)
  const usable = !handleProblem(slug, { loose: true }) && !bioHandleReserved(slug)
  return <BioFree handle={slug} signedIn={Boolean(session?.user?.email)} state={usable ? 'free' : 'unavailable'} />
}
