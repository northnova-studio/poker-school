// Riconoscimento del tipo di file dai magic bytes (mai fidarsi del Content-Type dichiarato).

export type AllowedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'application/pdf'

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'])

export function detectMime(buf: Buffer): AllowedMime | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.has(buf.subarray(8, 12).toString('latin1'))) return 'image/heic'
  return null
}

export const isImage = (mime: AllowedMime) => mime !== 'application/pdf'
