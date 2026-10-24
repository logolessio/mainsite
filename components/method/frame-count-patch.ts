/*
 * The frame-count patch (Motion4K Optimizer's delivery pass): the method the "TikTok Enhancer" / Editing News extension applies on its server, as
 * reverse engineered in github.com/BastienGimbert/tiktok-quality (MIT), done here in the browser on our own MP4 output.
 *
 * Not a pixel changes and nothing is re-encoded. The video track is told it holds `multiplier` times as many frames as it really does: the extra
 * ("ghost") frames come after the real ones in the sample tables and all point at one 8-byte filler NAL at the end of the media data, while the
 * track's own duration (mdhd, tkhd, and an edit list) stays the real one. Players play the real frames and stop; a pipeline that works the rate out
 * as frames / duration sees a far higher rate and keeps the upload on its high frame rate path. Alongside, as in the original: the isom brand, the
 * High profile fields in avcC, SEI stripped from the first frame, the sound track tidied to the video's timing, bitrates restated and a comment tag.
 *
 * Plain functions over bytes, no DOM: it runs in the page and in Node (for tests). Handles any timescale, 32 or 64-bit chunk offsets and one mdat.
 */

export type PatchStats = { realFrames: number; declaredFrames: number; ghostFrames: number; bytesBefore: number; bytesAfter: number; seiRemoved: number }

export const DEFAULT_MULTIPLIER = 10
export const DEFAULT_COMMENT = 'TK8vY5VqBA6hUlo1yuGvNA' // the original's signature tag, kept as it was
const PADDING_NAL = new Uint8Array([0, 0, 0, 4, 0, 0, 0, 0]) // a 4-byte NAL of type 0 (filler), length-prefixed
const KEEP_NAL = new Set([1, 5]) // slices; SEI, AUD and in-band parameter sets are dropped from the first frame
const LANG_UND = 0x55c4
const CONTAINERS = new Set(['moov', 'trak', 'edts', 'mdia', 'minf', 'stbl', 'dinf', 'udta'])

type Box = { type: string; data: Uint8Array; children?: Box[] } // data: the whole box (header included) for leaves; children for containers

const u32 = (d: Uint8Array, o: number) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0
const u64 = (d: Uint8Array, o: number) => u32(d, o) * 2 ** 32 + u32(d, o + 4)
const typeAt = (d: Uint8Array, o: number) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3])

class W {
  private parts: number[] = []
  u8(v: number) {
    this.parts.push(v & 0xff)
    return this
  }
  u16(v: number) {
    return this.u8(v >>> 8).u8(v)
  }
  u32(v: number) {
    return this.u8(v >>> 24).u8(v >>> 16).u8(v >>> 8).u8(v)
  }
  u64(v: number) {
    return this.u32(Math.floor(v / 2 ** 32)).u32(v >>> 0)
  }
  str(s: string) {
    for (const c of s) this.u8(c.charCodeAt(0))
    return this
  }
  bytes(b: Uint8Array) {
    for (const x of b) this.parts.push(x)
    return this
  }
  done() {
    return Uint8Array.from(this.parts)
  }
}

function leaf(type: string, body: Uint8Array): Box {
  const out = new Uint8Array(8 + body.length)
  out.set(new W().u32(8 + body.length).str(type).done())
  out.set(body, 8)
  return { type, data: out }
}
const fullLeaf = (type: string, version: number, flags: number, body: Uint8Array) => leaf(type, concat([new W().u8(version).u8(flags >>> 16).u8(flags >>> 8).u8(flags).done(), body]))

function concat(list: Uint8Array[]) {
  const n = list.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(n)
  let p = 0
  for (const b of list) {
    out.set(b, p)
    p += b.length
  }
  return out
}

function parse(d: Uint8Array, start: number, end: number): Box[] {
  const out: Box[] = []
  let p = start
  while (p + 8 <= end) {
    let size = u32(d, p)
    const type = typeAt(d, p + 4)
    let header = 8
    if (size === 1) {
      size = u64(d, p + 8)
      header = 16
    } else if (size === 0) size = end - p
    if (size < header || p + size > end) throw new Error(`Broken MP4 box ${type}`)
    out.push(CONTAINERS.has(type) && type !== 'udta' ? { type, data: d.subarray(p, p + size), children: parse(d, p + header, p + size) } : { type, data: d.subarray(p, p + size) })
    p += size
  }
  return out
}

function serialize(b: Box): Uint8Array {
  if (!b.children) return b.data
  const body = concat(b.children.map(serialize))
  return concat([new W().u32(8 + body.length).str(b.type).done(), body])
}

const child = (b: Box | undefined, type: string) => b?.children?.find((c) => c.type === type)
const path = (b: Box | undefined, ...types: string[]) => types.reduce<Box | undefined>((at, t) => child(at, t), b)
const replace = (parent: Box, type: string, next: Box | null, after?: string) => {
  const kids = parent.children!
  const i = kids.findIndex((c) => c.type === type)
  if (i >= 0) {
    if (next) kids[i] = next
    else kids.splice(i, 1)
  } else if (next) {
    const j = after ? kids.findIndex((c) => c.type === after) : -1
    kids.splice(j >= 0 ? j + 1 : kids.length, 0, next)
  }
}

// ---- reading the tables ----
const body = (b: Box) => b.data.subarray(u32(b.data, 0) === 1 ? 16 : 8)
function table(b: Box, width: number) {
  const d = body(b)
  const n = u32(d, 4)
  return Array.from({ length: n }, (_, i) => Array.from({ length: width }, (_, k) => u32(d, 8 + i * width * 4 + k * 4)))
}
function sizes(stsz: Box) {
  const d = body(stsz)
  const uniform = u32(d, 4)
  const n = u32(d, 8)
  return uniform ? Array.from({ length: n }, () => uniform) : Array.from({ length: n }, (_, i) => u32(d, 12 + i * 4))
}
function offsets(stco: Box) {
  const d = body(stco)
  const n = u32(d, 4)
  return stco.type === 'co64' ? Array.from({ length: n }, (_, i) => u64(d, 8 + i * 8)) : Array.from({ length: n }, (_, i) => u32(d, 8 + i * 4))
}
/** mvhd / mdhd: [timescale, duration] and where duration sits (for either version). */
function timing(b: Box) {
  const d = body(b)
  const v = d[0]
  return v === 1 ? { timescale: u32(d, 20), duration: u64(d, 24), at: 24, wide: true } : { timescale: u32(d, 12), duration: u32(d, 16), at: 16, wide: false }
}
function withDuration(b: Box, duration: number): Box {
  const d = body(b).slice()
  const t = timing(b)
  d.set(t.wide ? new W().u64(duration).done() : new W().u32(duration).done(), t.at)
  return leaf(b.type, d)
}
function tkhdWithDuration(b: Box, duration: number): Box {
  const d = body(b).slice()
  const wide = d[0] === 1
  d.set(wide ? new W().u64(duration).done() : new W().u32(duration).done(), wide ? 28 : 20)
  return leaf('tkhd', d)
}
const tkhdDuration = (b: Box) => (body(b)[0] === 1 ? u64(body(b), 28) : u32(body(b), 20))
const handler = (trak: Box) => {
  const h = path(trak, 'mdia', 'hdlr')
  return h ? typeAt(body(h), 8) : ''
}

// ---- building ----
const stts = (rows: number[][]) => fullLeaf('stts', 0, 0, concat([new W().u32(rows.length).done(), ...rows.map(([c, d]) => new W().u32(c).u32(d).done())]))
const ctts = (version: number, rows: number[][]) => fullLeaf('ctts', version, 0, concat([new W().u32(rows.length).done(), ...rows.map(([c, d]) => new W().u32(c).u32(d).done())]))
const stsc = (rows: number[][]) => fullLeaf('stsc', 0, 0, concat([new W().u32(rows.length).done(), ...rows.map(([a, b, c]) => new W().u32(a).u32(b).u32(c).done())]))
const stsz = (list: number[]) => fullLeaf('stsz', 0, 0, concat([new W().u32(0).u32(list.length).done(), ...list.map((s) => new W().u32(s).done())]))
const chunkOffsets = (list: number[], wide: boolean) =>
  fullLeaf(wide ? 'co64' : 'stco', 0, 0, concat([new W().u32(list.length).done(), ...list.map((o) => (wide ? new W().u64(o) : new W().u32(o)).done())]))
const btrt = (buffer: number, max: number, avg: number) => leaf('btrt', new W().u32(buffer).u32(max).u32(avg).done())
const ftyp = () => leaf('ftyp', new W().str('isom').u32(512).str('isomiso2avc1mp41').done())
const free = () => leaf('free', new Uint8Array(0))
const hdlr = (type: string, name: string) => fullLeaf('hdlr', 0, 0, concat([new W().u32(0).str(type).u32(0).u32(0).u32(0).done(), new TextEncoder().encode(name), new Uint8Array([0])]))
function udtaComment(comment: string): Box {
  const metaHdlr = fullLeaf('hdlr', 0, 0, new W().u32(0).str('mdir').str('appl').u32(0).u32(0).u8(0).done())
  const data = leaf('data', concat([new W().u32(1).u32(0).done(), new TextEncoder().encode(comment)]))
  const cmt = leaf('©cmt', data.data)
  const ilst = leaf('ilst', cmt.data)
  const meta = fullLeaf('meta', 0, 0, concat([metaHdlr.data, ilst.data]))
  return leaf('udta', meta.data)
}

/** avc1 sample entry with the High profile fields (chroma format, bit depths, no SPS extensions) added to avcC where they are missing, and btrt restated. */
function videoStsd(stsdBox: Box, avgBitrate: number): Box {
  const d = body(stsdBox)
  const entry = d.subarray(8) // after version/flags and the entry count
  const entrySize = u32(entry, 0)
  const type = typeAt(entry, 4)
  if (type !== 'avc1' && type !== 'avc3') throw new Error('The patch needs H.264 video.')
  const fixed = entry.subarray(8, 8 + 78)
  const inner = parse(entry, 8 + 78, entrySize)
  const out: Uint8Array[] = []
  let maxBitrate = avgBitrate
  for (const b of inner) {
    if (b.type === 'avcC') {
      const c = body(b)
      // skip the SPS and PPS lists to see whether the High profile fields are already there
      let p = 5
      const nSps = c[5] & 0x1f
      p = 6
      for (let i = 0; i < nSps; i++) p += 2 + ((c[p] << 8) | c[p + 1])
      const nPps = c[p]
      p += 1
      for (let i = 0; i < nPps; i++) p += 2 + ((c[p] << 8) | c[p + 1])
      const high = [100, 110, 122, 144].includes(c[1])
      out.push(high && p >= c.length ? leaf('avcC', concat([c, new Uint8Array([0xfd, 0xf8, 0xf8, 0x00])])).data : b.data)
    } else if (b.type === 'btrt') {
      maxBitrate = Math.max(u32(body(b), 4), avgBitrate)
    } else out.push(b.data)
  }
  out.push(btrt(0, maxBitrate, avgBitrate).data)
  const sampleEntry = leaf(type, concat([fixed, ...out]))
  return fullLeaf('stsd', 0, 0, concat([new W().u32(1).done(), sampleEntry.data]))
}

/** Restates the average (and, if lower, the maximum) bitrate in an mp4a entry's esds and btrt. */
function audioStsd(stsdBox: Box, avgBitrate: number): Box {
  const d = body(stsdBox).slice()
  const write = (at: number, v: number) => d.set(new W().u32(v).done(), at)
  // esds: find the DecoderConfigDescriptor (tag 4): object type (1), stream type (1), buffer size (3), max bitrate (4), average bitrate (4)
  for (let i = 0; i + 4 < d.length; i++) {
    if (typeAt(d, i) === 'esds') {
      for (let j = i + 8; j < Math.min(d.length - 14, i + 64); j++) {
        if (d[j] !== 0x04) continue
        let k = j + 1
        while (d[k] & 0x80) k++
        k++
        if (d[k] < 0x40 || d[k] > 0x6b) continue // not an audio object type
        if (u32(d, k + 5) < avgBitrate) write(k + 5, avgBitrate)
        write(k + 9, avgBitrate)
        break
      }
    }
    if (typeAt(d, i) === 'btrt') {
      if (u32(d, i + 8) < avgBitrate) write(i + 8, avgBitrate)
      write(i + 12, avgBitrate)
    }
  }
  return leaf('stsd', d)
}

/** Strips everything but slices from one length-prefixed sample (4-byte NAL lengths, as avcC says). */
function slicesOnly(sample: Uint8Array) {
  const keep: Uint8Array[] = []
  let p = 0
  while (p + 4 <= sample.length) {
    const n = u32(sample, p)
    if (p + 4 + n > sample.length) return sample
    if (KEEP_NAL.has(sample[p + 4] & 0x1f)) keep.push(sample.subarray(p, p + 4 + n))
    p += 4 + n
  }
  return keep.length ? concat(keep) : sample
}

export function patchFrameCount(input: ArrayBuffer | Uint8Array, opts: { multiplier?: number; comment?: string } = {}): { bytes: Uint8Array; stats: PatchStats } {
  const multiplier = Math.max(2, Math.round(opts.multiplier ?? DEFAULT_MULTIPLIER))
  const comment = opts.comment ?? DEFAULT_COMMENT
  const data = input instanceof Uint8Array ? input : new Uint8Array(input)
  const top = parse(data, 0, data.length)
  const moov = top.find((b) => b.type === 'moov')
  const mdatIndex = top.findIndex((b) => b.type === 'mdat')
  if (!moov || mdatIndex < 0 || top.filter((b) => b.type === 'mdat').length !== 1) throw new Error('The patch needs an MP4 with one media data box.')
  const mdat = top[mdatIndex]
  const mdatHeader = u32(mdat.data, 0) === 1 ? 16 : 8
  const mdatStart = mdat.data.byteOffset - data.byteOffset + mdatHeader // where its content starts, in the input
  const mdatContent = mdat.data.subarray(mdatHeader)

  const mvhd = child(moov, 'mvhd')!
  const movieTs = timing(mvhd).timescale
  const traks = moov.children!.filter((b) => b.type === 'trak')
  const vt = traks.find((t) => handler(t) === 'vide')
  const at = traks.find((t) => handler(t) === 'soun')
  if (!vt) throw new Error('There is no video track to patch.')

  // ---- video ----
  const vStbl = path(vt, 'mdia', 'minf', 'stbl')!
  const vSttsRows = table(child(vStbl, 'stts')!, 2)
  const vSizes = sizes(child(vStbl, 'stsz')!)
  const vStscRows = table(child(vStbl, 'stsc')!, 3)
  const vStco = child(vStbl, 'stco') ?? child(vStbl, 'co64')!
  const vChunks = offsets(vStco)
  const vMdhd = timing(path(vt, 'mdia', 'mdhd')!)
  const realFrames = vSizes.length
  const ghostFrames = realFrames * (multiplier - 1)
  const delta = vSttsRows[0]?.[1] ?? 1

  // the first frame, slices only
  const firstOff = vChunks[0]
  const firstRel = firstOff - mdatStart
  const first = data.subarray(firstOff, firstOff + vSizes[0])
  const newFirst = slicesOnly(first)
  const seiRemoved = first.length - newFirst.length

  const realSeconds = vMdhd.duration / vMdhd.timescale
  const videoBytes = vSizes.reduce((a, b) => a + b, 0) - seiRemoved
  const vAvg = Math.round((videoBytes * 8) / Math.max(realSeconds, 1e-3))

  replace(vStbl, 'stsd', videoStsd(child(vStbl, 'stsd')!, vAvg))
  replace(vStbl, 'stts', stts([...vSttsRows, [ghostFrames, delta]]))
  const vCtts = child(vStbl, 'ctts')
  if (vCtts) replace(vStbl, 'ctts', ctts(body(vCtts)[0], [...table(vCtts, 2), [ghostFrames, 0]]))
  replace(vStbl, 'stsc', stsc([...vStscRows, [vChunks.length + 1, 1, vStscRows.at(-1)?.[2] ?? 1]]))
  replace(vStbl, 'stsz', stsz([newFirst.length, ...vSizes.slice(1), ...Array(ghostFrames).fill(PADDING_NAL.length)]))

  // the edit list keeps the track to its real length (the ghosts sit after it), as the files the original was built for have
  const vTkhd = child(vt, 'tkhd')!
  const vTkhdDur = tkhdDuration(vTkhd)
  if (!child(vt, 'edts')) {
    const elst = fullLeaf('elst', 0, 0, new W().u32(1).u32(vTkhdDur).u32(0).u16(1).u16(0).done())
    replace(vt, 'edts', { type: 'edts', data: new Uint8Array(0), children: [elst] }, 'tkhd')
  }

  // ---- audio: its handler renamed, language und, the last sample trimmed so the track ends with its edit ----
  let audioTkhdDur = 0
  let aChunks: number[] = []
  let aStbl: Box | undefined
  let aStcoWide = false
  if (at) {
    aStbl = path(at, 'mdia', 'minf', 'stbl')!
    const aStco = child(aStbl, 'stco') ?? child(aStbl, 'co64')!
    aStcoWide = aStco.type === 'co64'
    aChunks = offsets(aStco)
    const aMdhdBox = path(at, 'mdia', 'mdhd')!
    const aMdhd = timing(aMdhdBox)
    const aSizes = sizes(child(aStbl, 'stsz')!)
    const aStts = table(child(aStbl, 'stts')!, 2)
    const elst = path(at, 'edts', 'elst')
    let newStts = aStts
    let newMdhdDur = aMdhd.duration
    audioTkhdDur = tkhdDuration(child(at, 'tkhd')!)
    if (elst) {
      const e = body(elst)
      const v1 = e[0] === 1
      const segMovie = v1 ? u64(e, 8) : u32(e, 8)
      const mediaTime = v1 ? u64(e, 16) : u32(e, 12)
      const seg = Math.round((segMovie * aMdhd.timescale) / movieTs)
      const aDelta = aStts[0][1]
      const mainN = aSizes.length - 1
      const last = seg + mediaTime - mainN * aDelta
      if (last > 0 && last <= aDelta) {
        newStts = last === aDelta ? [[aSizes.length, aDelta]] : [[mainN, aDelta], [1, last]]
        newMdhdDur = seg
        audioTkhdDur = segMovie
      }
    }
    const aBytes = aSizes.reduce((a, b) => a + b, 0)
    const aTicks = newStts.reduce((a, [c, d]) => a + c * d, 0)
    const aAvg = Math.round((aBytes * 8 * aMdhd.timescale) / Math.max(aTicks, 1))
    replace(aStbl, 'stsd', audioStsd(child(aStbl, 'stsd')!, aAvg))
    replace(aStbl, 'stts', stts(newStts))
    const md = withDuration(aMdhdBox, newMdhdDur)
    const mdb = md.data.slice()
    mdb.set(new W().u16(LANG_UND).done(), mdb.length - 4) // language sits before the 2-byte pre_defined field at the end
    replace(path(at, 'mdia')!, 'mdhd', { type: 'mdhd', data: mdb })
    replace(path(at, 'mdia')!, 'hdlr', hdlr('soun', 'SoundHandler'))
    replace(at, 'tkhd', tkhdWithDuration(child(at, 'tkhd')!, audioTkhdDur))
  }

  replace(moov, 'mvhd', withDuration(mvhd, Math.max(vTkhdDur, audioTkhdDur)))
  replace(moov, 'udta', udtaComment(comment))

  // ---- the new media data: the first frame without its SEI, everything else as it was, the filler at the end ----
  const newContent = concat([mdatContent.subarray(0, firstRel), newFirst, mdatContent.subarray(firstRel + first.length), PADDING_NAL])
  const wideMdat = newContent.length + 8 > 0xffffffff
  const mdatOut = wideMdat ? concat([new W().u32(1).str('mdat').u64(newContent.length + 16).done(), newContent]) : concat([new W().u32(newContent.length + 8).str('mdat').done(), newContent])

  // offsets are fixed-width fields: lay the file out with placeholders, then fill them in
  const wide = wideMdat || vStco.type === 'co64' || aStcoWide
  const vTotalChunks = vChunks.length + ghostFrames
  replace(vStbl, vStco.type, null)
  replace(vStbl, wide ? 'co64' : 'stco', chunkOffsets(Array(vTotalChunks).fill(0), wide))
  if (aStbl) {
    replace(aStbl, child(aStbl, 'co64') ? 'co64' : 'stco', null)
    replace(aStbl, wide ? 'co64' : 'stco', chunkOffsets(Array(aChunks.length).fill(0), wide))
  }
  const head = concat([ftyp().data, free().data])
  const moovSize = serialize(moov).length
  const contentStart = head.length + moovSize + (wideMdat ? 16 : 8)
  const move = (off: number, before: (rel: number) => boolean) => {
    const rel = off - mdatStart
    return contentStart + (before(rel) ? rel : rel - seiRemoved)
  }
  const padAt = contentStart + newContent.length - PADDING_NAL.length
  replace(vStbl, wide ? 'co64' : 'stco', chunkOffsets([...vChunks.map((o) => move(o, (r) => r <= firstRel)), ...Array(ghostFrames).fill(padAt)], wide))
  if (aStbl) replace(aStbl, wide ? 'co64' : 'stco', chunkOffsets(aChunks.map((o) => move(o, (r) => r < firstRel)), wide))
  const moovOut = serialize(moov)
  if (moovOut.length !== moovSize) throw new Error('The patched header changed size while it was laid out.')

  const bytes = concat([head, moovOut, mdatOut])
  return { bytes, stats: { realFrames, declaredFrames: realFrames + ghostFrames, ghostFrames, bytesBefore: data.length, bytesAfter: bytes.length, seiRemoved } }
}
