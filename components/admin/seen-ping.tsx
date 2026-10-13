'use client'

import { useEffect } from 'react'

/** Opening a conversation counts as seeing it: it stops showing as new. Renders nothing. */
export function SeenPing({ id, seen }: { id: string; seen: boolean }) {
  useEffect(() => {
    if (seen) return
    fetch(`/api/admin/inquiries/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'seen' }) }).catch(() => {})
  }, [id, seen])
  return null
}
