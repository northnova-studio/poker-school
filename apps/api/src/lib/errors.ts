// Errori applicativi → risposta {"error":{"code","message"}} (formato del contratto).
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST', details?: unknown) => new AppError(400, code, message, details)
export const unauthorized = (message = 'Autenticazione richiesta', code = 'UNAUTHORIZED') => new AppError(401, code, message)
export const forbidden = (message = 'Permessi insufficienti', code = 'FORBIDDEN') => new AppError(403, code, message)
export const notFound = (message = 'Risorsa non trovata', code = 'NOT_FOUND') => new AppError(404, code, message)
export const conflict = (message: string, code = 'CONFLICT') => new AppError(409, code, message)
export const gone = (message: string, code = 'GONE') => new AppError(410, code, message)
export const unavailable = (message: string, code = 'SERVICE_UNAVAILABLE') => new AppError(503, code, message)
