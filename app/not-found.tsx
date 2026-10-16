import type { Metadata } from 'next'
import Link from 'next/link'
import { PillLink } from '@/components/motion/cta'

export const metadata: Metadata = { title: 'Page not found | logoless', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div className="max-w-md">
        <p className="text-sm text-paper/50">Error 404</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">We can&apos;t find that page</h1>
        <p className="mt-5 text-lg leading-relaxed text-paper/60">It may have moved, or the link may have a typo. Here are some places to go instead.</p>
        <div className="mt-9 flex justify-center">
          <PillLink href="/">See campaigns</PillLink>
        </div>
        <p className="mt-8 text-[15px] text-paper/50">
          <Link href="/for-creators" className="underline underline-offset-4 hover:text-paper">
            For creators
          </Link>
          {' · '}
          <Link href="/for-brands" className="underline underline-offset-4 hover:text-paper">
            For brands
          </Link>
          {' · '}
          <Link href="/contact" className="underline underline-offset-4 hover:text-paper">
            Contact us
          </Link>
        </p>
      </div>
    </main>
  )
}
