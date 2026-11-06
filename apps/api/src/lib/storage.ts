// Adapter di storage per i documenti KYC (sempre già cifrati a monte).
// - local: disco (sviluppo)
// - s3: qualunque storage S3-compatibile; in produzione Cloudflare R2.
import fs from 'node:fs/promises'
import path from 'node:path'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../config/env.js'

export interface StorageAdapter {
  readonly driver: 'local' | 's3'
  put(key: string, data: Buffer): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
}

const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error('Chiave di storage non valida')
  return key
}

export class LocalStorage implements StorageAdapter {
  readonly driver = 'local' as const
  constructor(private root: string) {}
  private full(key: string) {
    return path.resolve(this.root, safeKey(key))
  }
  async put(key: string, data: Buffer) {
    const p = this.full(key)
    await fs.mkdir(path.dirname(p), { recursive: true, mode: 0o700 })
    await fs.writeFile(p, data, { mode: 0o600 })
  }
  async get(key: string) {
    return fs.readFile(this.full(key))
  }
  async delete(key: string) {
    await fs.rm(this.full(key), { force: true })
  }
}

export class S3Storage implements StorageAdapter {
  readonly driver = 's3' as const
  private client: S3Client
  constructor(private bucket: string) {
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
    })
  }
  async put(key: string, data: Buffer) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: safeKey(key),
        Body: data,
        ContentType: 'application/octet-stream',
      }),
    )
  }
  async get(key: string) {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }))
    if (!out.Body) throw new Error('Oggetto vuoto')
    return Buffer.from(await out.Body.transformToByteArray())
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }))
  }
}

let instance: StorageAdapter | null = null
export function storage(): StorageAdapter {
  instance ??= env.STORAGE_DRIVER === 's3' ? new S3Storage(env.S3_BUCKET!) : new LocalStorage(path.resolve(env.STORAGE_LOCAL_DIR))
  return instance
}
