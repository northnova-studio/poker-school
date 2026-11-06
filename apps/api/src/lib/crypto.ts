// Primitive crittografiche (solo node:crypto, nessuna dipendenza nativa).
import crypto from 'node:crypto'

export const sha256Hex = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex')

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url')

export function hmacHex(key: Buffer | string, data: string | Buffer, algo = 'sha256') {
  return crypto.createHmac(algo, key).update(data).digest('hex')
}

/** Confronto a tempo costante di due stringhe (hex/base64). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export interface EncryptedBlob {
  ciphertext: Buffer
  iv: string // base64
  authTag: string // base64
}

/**
 * AES-256-GCM. `aad` (additional authenticated data) lega il ciphertext al suo
 * identificativo: un blob spostato su un altro record non si decifra.
 */
export function encryptAesGcm(key: Buffer, plaintext: Buffer, aad: string): EncryptedBlob {
  if (key.length !== 32) throw new Error('Chiave AES-256 non valida')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(aad))
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return { ciphertext, iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64') }
}

export function decryptAesGcm(key: Buffer, blob: EncryptedBlob, aad: string): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'))
  decipher.setAAD(Buffer.from(aad))
  decipher.setAuthTag(Buffer.from(blob.authTag, 'base64'))
  return Buffer.concat([decipher.update(blob.ciphertext), decipher.final()])
}

/** Deriva una sottochiave indipendente (HKDF-SHA256) da una chiave master. */
export function deriveKey(master: Buffer, info: string, length = 32): Buffer {
  return Buffer.from(crypto.hkdfSync('sha256', master, Buffer.from('tris-api'), Buffer.from(info), length))
}
