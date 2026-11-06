'use client'

import { Download, FileUp, Film, ImageIcon, Loader2, MousePointer2, Music2, RefreshCw, RotateCcw, Trash2, User } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_BIO, normalizeBio } from '@/lib/bio'
import { clearStored, listStored, type StoredItem } from '@/lib/visitor-prefs'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Btn, Group } from './ui'

type File = { id: string; kind: string; mime: string; size: number; at: number; used: boolean }
type Listing = { files: File[]; usedBytes: number; counters: number }

const KIND: Record<string, { name: string; icon: typeof ImageIcon }> = {
  avatar: { name: 'Profile picture', icon: User },
  banner: { name: 'Picture', icon: ImageIcon },
  cover: { name: 'Picture', icon: ImageIcon },
  background: { name: 'Background', icon: ImageIcon },
  bgvideo: { name: 'Background video', icon: Film },
  cursor: { name: 'Cursor', icon: MousePointer2 },
  audio: { name: 'Song', icon: Music2 },
  file: { name: 'Hosted file', icon: FileUp },
}
const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`)
const when = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** The upload ids the page in the editor uses right now, saved or not (so clearing never pulls one out from under the preview). */
function draftIds(api: EditorApi) {
  const c = api.cfg
  return [c.bg.image, c.bg.video, c.cursor.image, c.audio.id, c.audio.cover, c.card.banner, api.profile.newAvatar ?? ''].filter((x) => /^[0-9a-f-]{36}$/.test(x))
}

/** Every upload one by one, clearing what nothing uses, resetting the counters, and what this browser keeps. `changed` tells the meter to refresh. */
export function StorageManager({ api, changed }: { api: EditorApi; changed: () => void }) {
  const { toast } = api
  const [data, setData] = useState<Listing | null>(null)
  const [busy, setBusy] = useState(false)
  const [device, setDevice] = useState<StoredItem[]>([])
  const keep = draftIds(api)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/me/storage?list=1', { cache: 'no-store' })
      if (!r.ok) throw new Error()
      setData((await r.json()) as Listing)
    } catch {
      toast("couldn't load your files. try again.")
    }
  }, [toast])
  useEffect(() => {
    void load()
    void listStored().then(setDevice)
  }, [load])

  const clear = async (payload: Record<string, unknown>, done: (j: Listing & { deleted: number; skipped: number }) => string) => {
    setBusy(true)
    try {
      const r = await fetch('/api/me/storage', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, keep }) })
      const j = (await r.json()) as Listing & { deleted: number; skipped: number; error?: string }
      if (!r.ok) throw new Error(j.error)
      setData(j)
      changed()
      toast(done(j))
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "couldn't clear that. try again.")
    }
    setBusy(false)
  }

  const isUsed = (f: File) => f.used || keep.includes(f.id)
  const unused = data?.files.filter((f) => !isUsed(f) && f.kind !== 'file') ?? []
  const unusedBytes = unused.reduce((n, f) => n + f.size, 0)

  return (
    <div>
      <Group title="Your uploads" hint="Everything you've uploaded, newest first. Files your page uses are marked and can't be deleted here: change them on the page first. Hosted files are only deleted one by one." fold>
        {!data ? (
          <Loader2 className="size-4 animate-spin text-white/50" />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Used', size(data.usedBytes)],
                ['Files', String(data.files.length)],
                ['Clearable', size(unusedBytes)],
              ].map(([k, v]) => (
                <div key={k} className="border border-[var(--ed-line)] p-3">
                  <p className="text-[0.68rem] text-[var(--ed-mute)]">{k}</p>
                  <p className="mt-1 text-[1.1rem] tabular-nums">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <ConfirmBtn disabled={busy || !unused.length} confirm={`delete ${unused.length}? press again`} onConfirm={() => void clear({ unused: true }, (j) => (j.deleted ? `cleared ${j.deleted} file${j.deleted === 1 ? '' : 's'}.` : 'nothing to clear.'))}>
                <Trash2 className="size-4" /> Clear unused ({unused.length})
              </ConfirmBtn>
              <button type="button" onClick={() => void load()} className="inline-flex h-9 items-center gap-1.5 px-2 text-[0.74rem] text-white/50 hover:text-white">
                <RefreshCw className="size-3.5" /> refresh
              </button>
            </div>
            {data.files.length === 0 ? (
              <p className="text-[0.8rem] text-[var(--ed-mute)]">no uploads yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--ed-line)] border border-[var(--ed-line)]">
                {data.files.map((f) => {
                  const k = KIND[f.kind] ?? { name: f.kind, icon: ImageIcon }
                  const used = isUsed(f)
                  return (
                    <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden bg-white/[0.05]">
                        {f.mime.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/img/${f.id}`} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <k.icon className="size-4 text-white/50" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8rem]">{k.name}</span>
                        <span className="block text-[0.68rem] text-[var(--ed-mute)]">
                          {size(f.size)} · {when(f.at)}
                        </span>
                      </span>
                      {used ? (
                        <span className="bg-white px-1.5 text-[0.62rem] text-black">in use</span>
                      ) : (
                        <button type="button" disabled={busy} onClick={() => void clear({ ids: [f.id] }, () => 'deleted.')} aria-label={`Delete this ${k.name.toLowerCase()}`} className="grid size-8 place-items-center text-white/40 hover:text-white disabled:opacity-30">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-[0.7rem] leading-snug text-[var(--ed-dim)]">old uploads also clear themselves: we keep the latest few of each kind, and never one your page uses.</p>
          </>
        )}
      </Group>

      <Group title="Views and clicks" hint="Start your insights from zero. The counts can't be brought back." fold>
        <ConfirmBtn disabled={busy || !data?.counters} confirm="reset them all? press again" onConfirm={() => void clear({ stats: true }, () => 'views and clicks reset. reload the editor to see zero.')}>
          <RefreshCw className="size-4" /> Reset views and clicks
        </ConfirmBtn>
      </Group>

      <Group title="This device" hint="What logoless keeps in this browser. Clearing it doesn't touch your page or log you out." fold>
        {device.length === 0 ? (
          <p className="text-[0.78rem] text-[var(--ed-mute)]">nothing stored here.</p>
        ) : (
          <ul className="space-y-1 text-[0.76rem] text-[var(--ed-mute)]">
            {[...new Map(device.map((d) => [d.label, d])).values()].map((d) => (
              <li key={d.label} className="flex justify-between gap-3">
                <span>{d.label}</span>
                <span className={cn('tabular-nums text-white/35')}>{d.where === 'session' ? 'this visit' : d.where === 'cache' ? 'saved files' : size(d.bytes)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <ConfirmBtn
            onConfirm={() => {
              void clearStored().then(() => listStored().then(setDevice))
              toast('cleared this device.')
            }}
          >
            <Trash2 className="size-4" /> Clear this device
          </ConfirmBtn>

          <a href="/preferences" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center px-2 text-[0.74rem] text-white/50 underline underline-offset-4 hover:text-white">
            visitor preferences
          </a>
        </div>
      </Group>
    </div>
  )
}

/** A button for something that can't be undone: the first press asks, the second (within a few seconds) does it. */
function ConfirmBtn({ children, confirm = 'Press again to confirm', onConfirm, disabled }: { children: ReactNode; confirm?: string; onConfirm: () => void; disabled?: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 3500)
    return () => window.clearTimeout(t)
  }, [armed])
  return (
    <Btn variant={armed ? 'solid' : 'ghost'} disabled={disabled} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirm : children}
    </Btn>
  )
}

/** Save the whole page to a file, load it back, or start the look over (links, music and extra pages stay). */
export function BackupGroup({ api }: { api: EditorApi }) {
  const { cfg, set, toast, profile } = api
  const file = useRef<HTMLInputElement>(null)
  const download = () => {
    const blob = new Blob([JSON.stringify({ app: 'logoless', v: 1, at: new Date().toISOString(), handle: profile.handle, page: cfg }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `logoless-${profile.handle || 'page'}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const load = async (f: globalThis.File | undefined) => {
    if (!f) return
    try {
      if (f.size > 400_000) throw new Error('That file is too big to be a backup.')
      const j = JSON.parse(await f.text()) as { page?: unknown }
      const next = normalizeBio(j.page ?? j, cfg)
      set(() => next)
      toast('Backup loaded. Press save to keep it.')
    } catch (e) {
      toast(e instanceof Error && e.message.startsWith('That') ? e.message : "That isn't a logoless backup.")
    }
    if (file.current) file.current.value = ''
  }
  return (
    <Group title="Backup" hint="Download your whole page as a file, try things, and load it back any time. Pictures and songs stay on logoless; the file points to them." fold>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void load(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={download}>
          <Download className="size-4" /> Download
        </Btn>
        <Btn onClick={() => file.current?.click()}>
          <FileUp className="size-4" /> Load a backup
        </Btn>
        <ConfirmBtn confirm="Reset the look? Press again" onConfirm={() => (set((c) => normalizeBio({ ...DEFAULT_BIO, blocks: c.blocks, pages: c.pages, audio: c.audio, lyrics: c.lyrics }, DEFAULT_BIO)), toast('The look is back to the start. Your links, pages and music stayed.'))}>
          <RotateCcw className="size-4" /> Start the look over
        </ConfirmBtn>
      </div>
    </Group>
  )
}
