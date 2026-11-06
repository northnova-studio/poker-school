import type { Request } from 'express'
import { prisma } from './prisma.js'
import { logger } from './logger.js'
import type { Prisma } from '../generated/prisma/client.js'

/** Registro attività amministrative (chi ha fatto cosa e quando). Non blocca mai la richiesta. */
export async function audit(
  req: Request | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Prisma.InputJsonValue,
) {
  try {
    await prisma.auditLog.create({
      data: { actorId: req?.user?.id ?? null, action, entity, entityId: entityId ?? null, meta, ip: req?.ip ?? null },
    })
  } catch (err) {
    logger.error({ err, action }, 'audit log fallito')
  }
}
