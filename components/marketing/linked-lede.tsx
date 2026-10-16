'use client'

import { useCopy } from '@/components/shell/copy-provider'
import { TransitionLink } from '@/components/shell/transition-link'

/** The sentence under a page headline. Wherever it says "contact us" (in whatever words the team has saved), those words link to the contact page. */
export function LinkedLede({ text }: { text: string }) {
  const { tx } = useCopy()
  const shown = tx(text)
  const parts = shown.split(/(contact us)/i)
  if (parts.length === 1) return <>{shown}</>
  return (
    <>
      {parts.map((p, i) =>
        /^contact us$/i.test(p) ? (
          <TransitionLink key={i} href="/contact" className="text-paper underline decoration-paper/40 underline-offset-4 transition-colors hover:decoration-paper">
            {p}
          </TransitionLink>
        ) : (
          p
        ),
      )}
    </>
  )
}
