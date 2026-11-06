import os from 'node:os'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'

// .env.test (facoltativo) definisce TEST_DATABASE_URL: un DB dedicato, azzerato a ogni run.
loadEnv({ path: '.env.test', quiet: true })
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/poker_school_test'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    fileParallelism: false, // i file condividono lo stesso database
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB,
      TEST_DATABASE_URL: TEST_DB,
      JWT_ACCESS_SECRET: 'test-secret-0123456789-0123456789-abcdef',
      KYC_ENC_KEY: Buffer.alloc(32, 7).toString('base64'),
      KYC_WEBHOOK_SECRET: 'test-kyc-webhook-secret',
      KYC_PROVIDER: 'MANUAL',
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: path.join(os.tmpdir(), 'tris-api-test-storage'),
      PUBLIC_API_URL: 'http://api.test',
      CORS_ORIGINS: 'https://northnova-studio.github.io,http://localhost:5173',
      RATE_LIMIT_ENABLED: 'false',
      JOBS_ENABLED: 'false',
      LOG_LEVEL: 'silent',
      STRIPE_SECRET_KEY: '',
      BUNNY_STREAM_LIBRARY_ID: '',
      BUNNY_STREAM_TOKEN_KEY: '',
    },
  },
})
