'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { useTransitions } from './transition-provider'

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string }

export function TransitionLink({ href, onClick, ...props }: Props) {
  const { navigate } = useTransitions()
  return (
    <Link
      href={href}
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
