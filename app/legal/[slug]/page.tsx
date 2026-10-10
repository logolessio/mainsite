import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LegalDocView } from '@/components/legal/legal-doc'
import { LEGAL, getLegal } from '@/lib/legal'

type Props = { params: Promise<{ slug: string }> }

export const generateStaticParams = () => LEGAL.map((d) => ({ slug: d.slug }))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getLegal((await params).slug)
  return doc ? { title: `${doc.title} — logoless`, description: doc.summary } : {}
}

export default async function Page({ params }: Props) {
  const doc = getLegal((await params).slug)
  if (!doc) notFound()
  return <LegalDocView doc={doc} />
}
