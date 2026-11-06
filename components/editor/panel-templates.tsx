'use client'

import { useState } from 'react'
import { type BioPreset, PRESETS, applyPreset } from '@/lib/bio'
import { LookTile } from './look-tile'
import type { EditorApi } from './types'
import { Group } from './ui'

/** One tap sets the colours, the card, the effect and the type. The links, the layout and the words are never touched. */
export function TemplatesPanel({ api }: { api: EditorApi }) {
  const { set, toast, profile } = api
  const [last, setLast] = useState<string | null>(null)
  const name = (profile.name || profile.handle || 'you').slice(0, 12)
  const use = (p: BioPreset) => {
    set((c) => applyPreset(c, p))
    setLast(p.id)
    toast(`${p.name} is on`)
  }
  return (
    <div>
      <Group title="Looks" hint="One tap sets the colours, the card, the effect and the type. Your links, layout and words stay as they are.">
        <div className="grid grid-cols-2 gap-4">
          {PRESETS.map((p) => (
            <LookTile key={p.id} p={p} name={name} on={last === p.id} onClick={() => use(p)} />
          ))}
        </div>
      </Group>
    </div>
  )
}
