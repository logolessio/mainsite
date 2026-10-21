'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
      <Printer aria-hidden="true" className="size-4" /> Print or save as PDF
    </button>
  )
}
