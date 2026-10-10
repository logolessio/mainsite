'use client'

import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'
import { Field, Input, Select } from '@/components/ui/fields'
import { INDUSTRIES } from '@/lib/onboarding'
import type { StepProps } from '../types'
import { StepTitle } from '../ui'

export function BrandStep({ data, update }: StepProps) {
  const file = useRef<HTMLInputElement>(null)
  const onFile = (f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return
    if (data.logo) URL.revokeObjectURL(data.logo)
    // TODO(backend): upload and store the returned URL
    update({ logo: URL.createObjectURL(f) })
  }
  return (
    <div>
      <StepTitle title="Tell us about you" sub="Clippers see this before they join your campaigns." />

      <div className="mt-7 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => file.current?.click()}
          aria-label="Upload a logo or photo"
          className="grid size-24 place-items-center overflow-hidden rounded-[28px] border border-dashed border-line-strong bg-white/[0.04] text-mute transition-colors hover:text-paper"
        >
          {data.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logo} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6" />
          )}
        </button>
        <input ref={file} type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        <span className="text-xs text-mute">Logo or artist photo</span>
      </div>

      <div className="mt-6 grid gap-4">
        <Field label="Name">
          <Input value={data.company} onChange={(e) => update({ company: e.target.value })} placeholder="Artist, channel or company name" maxLength={60} />
        </Field>
        <Field label="Website or main link" hint="Optional.">
          <Input value={data.website} onChange={(e) => update({ website: e.target.value })} inputMode="url" placeholder="https://" />
        </Field>
        <Field label="What best describes you?">
          <Select value={data.industry} onChange={(e) => update({ industry: e.target.value })}>
            <option value="" disabled>
              Select one
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  )
}
