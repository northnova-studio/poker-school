import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { AppError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { env } from '../config/env.js'
import { Prisma } from '../generated/prisma/client.js'

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Endpoint non trovato: ${req.method} ${req.path}` } })
}

// Formato errori del contratto: {"error":{"code","message"}} (+ details facoltativo)
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } })
    return
  }
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File troppo grande (max ${env.KYC_MAX_FILE_MB} MB)`
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? `Campo file non previsto: ${err.field ?? ''}`
          : `Upload non valido (${err.code})`
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: err.code, message: msg } })
    return
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'Risorsa già esistente' } })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Risorsa non trovata' } })
      return
    }
  }
  const e = err as { type?: string; status?: number }
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON non valido' } })
    return
  }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Richiesta troppo grande' } })
    return
  }
  if (err instanceof Error && err.message === 'CORS_NOT_ALLOWED') {
    res.status(403).json({ error: { code: 'CORS_NOT_ALLOWED', message: 'Origine non autorizzata' } })
    return
  }
  logger.error({ err, path: req.path, method: req.method }, 'errore non gestito')
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Errore interno del server' } })
}
