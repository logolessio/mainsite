'use client'

import { FileDown, Loader2, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type HostStatus, hostFile, hostStatus, removeHosted } from '@/lib/image-client'
import { StorageMeter } from './storage-meter'
import { Btn } from './ui'

const HOSTED = /^https:\/\/buzzheavier\.com\/([a-z0-9]{6,32})$/i
export const hostedId = (url: string) => HOSTED.exec(url)?.[1] ?? null

const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

let status: Promise<HostStatus | null> | null = null

/**
 * Hosting for a link: pick a file (a preset pack, a LUT, a project file, a zip) and the link becomes its download page. It is for things people take
 * away. A picture, video or song shown on the page itself is set in Customize instead.
 */
export function HostFile({ url, onUrl, onFile, toast }: { url: string; onUrl: (url: string) => void; onFile: (f: { name: string; size: number }) => void; toast: (m: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [info, setInfo] = useState<HostStatus | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [moved, setMoved] = useState(0)
  const id = hostedId(url)
  useEffect(() => {
    status ??= hostStatus()
    void status.then(setInfo)
  }, [])
  if (!info?.enabled) return null

  const send = async (f: File | undefined) => {
    if (!f) return
    if (f.size > info.maxBytes) return toast(`That file is over ${size(info.maxBytes)}, which is all the storage you have. Host it somewhere else and paste the link.`)
    setDone(0)
    try {
      const old = id
      const got = await hostFile(f, setDone)
      onUrl(got.url)
      onFile({ name: got.name, size: got.size })
      status = null
      setMoved((n) => n + 1)
      if (old) void removeHosted(old).catch(() => null)
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setDone(null)
  }
  const remove = async () => {
    if (!id) return
    setDone(0)
    try {
      await removeHosted(id)
      onUrl('')
      status = null
      setMoved((n) => n + 1)
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't remove that. try again.")
    }
    setDone(null)
  }

  return (
    <div className="rounded-xl border border-dashed border-[var(--ed-line2)] p-3">
      <input ref={input} type="file" hidden onChange={(e) => (void send(e.target.files?.[0]), (e.target.value = ''))} />
      {done !== null ? (
        <div>
          <p className="flex items-center gap-2 text-[0.78rem] text-white/70">
            <Loader2 className="size-3.5 animate-spin" /> {done >= 1 ? 'Finishing up' : `Uploading ${Math.round(done * 100)}%`}
          </p>
          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-white transition-[width] duration-200" style={{ width: `${Math.round(done * 100)}%` }} />
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => input.current?.click()}>
            {id ? <Upload className="size-3.5" /> : <FileDown className="size-3.5" />} {id ? 'Replace the file' : 'Host a file'}
          </Btn>
          {id && (
            <Btn variant="quiet" onClick={() => void remove()}>
              <Trash2 className="size-3.5" /> Remove it
            </Btn>
          )}
          <p className="min-w-0 flex-1 text-[0.72rem] leading-snug text-[var(--ed-mute)]">
            {id ? 'This link opens your file on a download page.' : 'Or put a file here instead of a link: a pack, a LUT, a project, a zip. No programs.'}
          </p>
        </div>
      )}
      <StorageMeter refresh={moved} className="mt-3 border-t border-[var(--ed-line)] pt-3" />
    </div>
  )
}
