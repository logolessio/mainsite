'use client'

import { cn } from '@/lib/utils'
import { useCopy } from '@/components/shell/copy-provider'

/** A large statement. It used to light up word by word on scroll; now it just sits there and reads. */
export function ScrollText({ text, className }: { text: string; className?: string }) {
  const { tx } = useCopy()
  return <p className={cn('text-left', className)}>{tx(text)}</p>
}
