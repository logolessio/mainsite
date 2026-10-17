'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ComponentProps } from 'react'
import { useTransitions } from './transition-provider'

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

export function TransitionLink({ href, onClick, onPointerEnter, onTouchStart, onFocus, ...props }: Props) {
  const { navigate } = useTransitions()
  const router = useRouter()
  // Start fetching the page as soon as a pointer, finger or keyboard arrives, so the click itself is nearly instant.
  const warm = () => {
    if (href.startsWith('/')) router.prefetch(href)
  }
  return (
    <Link
      href={href}
      onPointerEnter={(e) => (warm(), onPointerEnter?.(e))}
      onTouchStart={(e) => (warm(), onTouchStart?.(e))}
      onFocus={(e) => (warm(), onFocus?.(e))}
      onClick={(e) => {
        onClick?.(e)
        if (!href.startsWith('/') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        navigate(href)
      }}
      {...props}
    />
  )
}
